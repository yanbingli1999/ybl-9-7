import type { 
  Trip, 
  Commission, 
  Goods, 
  Weather, 
  GameEvent, 
  SettlementResult,
  LedgerEntry,
  ReputationGrade,
  GoodsQuality,
  QualityGrade,
  DamageType,
} from '../../shared/types';
import { calculateIsLateGameTime } from './gameLogic';
import {
  createInitialQuality,
  calculateTransportQualityDegradation,
  calculateAveragePriceMultiplier,
  calculateAverageReputationMultiplier,
  getCurrentQualityGrade,
} from './qualitySystem';

export interface TripSettlement {
  tripId: string;
  commissions: {
    commissionId: string;
    goodsName: string;
    quantity: number;
    delivered: number;
    damaged: number;
    quality: GoodsQuality;
    qualityGrade: QualityGrade;
    damageType?: DamageType;
    baseReward: number;
    actualReward: number;
    isLate: boolean;
    latePenalty: number;
    qualityPenalty: number;
  }[];
  tripCost: number;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  reputationChange: number;
  events: string[];
  lateCount: number;
  damageCount: number;
}

export const calculateReputationGrade = (score: number): { grade: ReputationGrade; priceBonus: number } => {
  if (score >= 900) {
    return { grade: '甲', priceBonus: 20 };
  } else if (score >= 700) {
    return { grade: '乙', priceBonus: 10 };
  } else if (score >= 400) {
    return { grade: '丙', priceBonus: 0 };
  } else {
    return { grade: '丁', priceBonus: -10 };
  }
};

export const settleTrip = (
  trip: Trip,
  commissions: Commission[],
  goodsList: Goods[],
  weather: Weather,
  routeCondition: number,
  isOverloaded: boolean,
  eventEffects: { title: string; effect: any }[],
  reputationBonus: number,
  totalTripHours: number
): TripSettlement => {
  let totalIncome = 0;
  let totalExpense = trip.totalCost;
  let reputationChange = 0;
  let lateCount = 0;
  let damageCount = 0;
  const eventDescriptions: string[] = [];
  
  let extraDelay = 0;
  let totalEventDamage = 0;
  
  eventEffects.forEach(item => {
    const { title, effect } = item;
    if (effect.type === 'delay') {
      extraDelay += effect.value as number;
    }
    if (effect.type === 'reputation') {
      reputationChange += effect.value as number;
    }
    if (effect.type === 'gold') {
      if ((effect.value as number) < 0) {
        totalExpense += Math.abs(effect.value as number);
      } else {
        totalIncome += (effect.value as number);
      }
    }
    if (effect.type === 'damage') {
      totalEventDamage += effect.value as number;
    }
    eventDescriptions.push(`${title}: ${effect.description}`);
  });
  
  const settledCommissions = commissions.map(commission => {
    const goods = goodsList.find(g => g.id === commission.goodsId);
    const goodsName = goods?.name || '未知货物';
    
    const qualityResult = goods
      ? calculateTransportQualityDegradation(
          commission,
          goods,
          weather,
          routeCondition,
          isOverloaded,
          totalEventDamage
        )
      : { quality: createInitialQuality(commission.quantity), damageType: 'wear' as DamageType };
    
    const { quality, damageType } = qualityResult;
    const qualityGrade = getCurrentQualityGrade(quality);
    
    const acceptedGameHours = commission.acceptedGameHours || trip.departureGameHours || 0;
    const departedGameHours = trip.departureGameHours || 0;
    
    const isLate = calculateIsLateGameTime(
      acceptedGameHours,
      commission.deadlineHours,
      departedGameHours,
      totalTripHours,
      extraDelay
    );
    
    const latePenalty = isLate ? Math.floor(commission.reward * 0.3) : 0;
    if (latePenalty > 0) {
      totalExpense += latePenalty;
    }
    
    const priceMultiplier = goods ? calculateAveragePriceMultiplier(quality, goods) : 1;
    const qualityPenalty = Math.floor(commission.reward * (1 - priceMultiplier));
    
    const bonusMultiplier = 1 + (reputationBonus / 100);
    const baseReward = Math.floor(commission.reward * priceMultiplier * bonusMultiplier);
    const actualReward = Math.max(0, baseReward - latePenalty);
    
    totalIncome += actualReward;
    
    if (isLate) {
      reputationChange -= 30;
      lateCount++;
    } else {
      reputationChange += 20;
    }
    
    const repMultiplier = goods ? calculateAverageReputationMultiplier(quality, goods) : 1;
    if (repMultiplier < 1) {
      const reputationLoss = Math.floor(20 * (1 - repMultiplier));
      reputationChange -= reputationLoss;
      damageCount++;
    }
    
    return {
      commissionId: commission.id,
      goodsName,
      quantity: commission.quantity,
      delivered: quality.perfect + quality.good + quality.fair + quality.poor,
      damaged: quality.damaged,
      quality,
      qualityGrade,
      damageType,
      baseReward: commission.reward,
      actualReward,
      isLate,
      latePenalty,
      qualityPenalty,
    };
  });
  
  const totalProfit = totalIncome - totalExpense;
  
  return {
    tripId: trip.id,
    commissions: settledCommissions,
    tripCost: trip.totalCost,
    totalIncome,
    totalExpense,
    totalProfit,
    reputationChange,
    events: eventDescriptions,
    lateCount,
    damageCount,
  };
};

export const generateLedgerEntries = (
  settlement: TripSettlement,
  day: number,
  date: string
): LedgerEntry[] => {
  const entries: LedgerEntry[] = [];
  
  if (settlement.totalIncome > 0) {
    entries.push({
      id: '',
      type: 'income',
      description: `运输收入 - ${settlement.commissions.map(c => c.goodsName).join(', ')}`,
      amount: settlement.totalIncome,
      date,
      day,
      category: '运输',
      createdAt: 0,
    });
  }
  
  if (settlement.tripCost > 0) {
    entries.push({
      id: '',
      type: 'expense',
      description: `运输成本 - 车辆费用`,
      amount: settlement.tripCost,
      date,
      day,
      category: '成本',
      createdAt: 0,
    });
  }
  
  settlement.commissions.forEach(c => {
    if (c.latePenalty > 0) {
      entries.push({
        id: '',
        type: 'expense',
        description: `迟到罚款 - ${c.goodsName}`,
        amount: c.latePenalty,
        date,
        day,
        category: '罚款',
        createdAt: 0,
      });
    }
    if (c.qualityPenalty > 0) {
      entries.push({
        id: '',
        type: 'expense',
        description: `品相损耗 - ${c.goodsName}`,
        amount: c.qualityPenalty,
        date,
        day,
        category: '货损',
        createdAt: 0,
      });
    }
  });
  
  return entries;
};

export const calculateWarehouseUpgradeCost = (currentLevel: number): number => {
  return 500 * Math.pow(2, currentLevel - 1);
};

export const calculateWarehouseCapacity = (level: number): number => {
  return 100 + (level - 1) * 50;
};
