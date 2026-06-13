import type {
  Goods,
  GoodsQuality,
  QualityGrade,
  QualityStage,
  DamageType,
  TreatmentType,
  TreatmentOption,
  Commission,
  Weather,
} from '../../shared/types';

const GRADE_ORDER: QualityGrade[] = ['perfect', 'good', 'fair', 'poor', 'damaged'];

export const getGradeIndex = (grade: QualityGrade): number => {
  return GRADE_ORDER.indexOf(grade);
};

export const getGradeByIndex = (index: number): QualityGrade => {
  const clampedIndex = Math.max(0, Math.min(GRADE_ORDER.length - 1, index));
  return GRADE_ORDER[clampedIndex];
};

export const createInitialQuality = (quantity: number): GoodsQuality => {
  return {
    perfect: quantity,
    good: 0,
    fair: 0,
    poor: 0,
    damaged: 0,
  };
};

export const getQualityStage = (goods: Goods, grade: QualityGrade): QualityStage | undefined => {
  return goods.qualityStages.find(s => s.grade === grade);
};

export const getCurrentQualityGrade = (quality: GoodsQuality): QualityGrade => {
  const grades: QualityGrade[] = ['perfect', 'good', 'fair', 'poor', 'damaged'];
  for (const grade of grades) {
    if (quality[grade] > 0) {
      return grade;
    }
  }
  return 'perfect';
};

export const getTotalQuantity = (quality: GoodsQuality): number => {
  return quality.perfect + quality.good + quality.fair + quality.poor + quality.damaged;
};

export const calculateAveragePriceMultiplier = (quality: GoodsQuality, goods: Goods): number => {
  const total = getTotalQuantity(quality);
  if (total === 0) return 0;
  
  let weightedSum = 0;
  for (const stage of goods.qualityStages) {
    const count = quality[stage.grade];
    if (count > 0) {
      weightedSum += count * stage.priceMultiplier;
    }
  }
  
  return weightedSum / total;
};

export const calculateAverageReputationMultiplier = (quality: GoodsQuality, goods: Goods): number => {
  const total = getTotalQuantity(quality);
  if (total === 0) return 0;
  
  let weightedSum = 0;
  for (const stage of goods.qualityStages) {
    const count = quality[stage.grade];
    if (count > 0) {
      weightedSum += count * stage.reputationMultiplier;
    }
  }
  
  return weightedSum / total;
};

export const downgradeQuality = (
  quality: GoodsQuality,
  levels: number,
  quantityToDowngrade?: number
): GoodsQuality => {
  const total = getTotalQuantity(quality);
  const amount = quantityToDowngrade ?? total;
  const actualAmount = Math.min(amount, total);
  
  const result = { ...quality };
  let remaining = actualAmount;
  
  for (let i = 0; i < GRADE_ORDER.length - 1 && remaining > 0; i++) {
    const grade = GRADE_ORDER[i];
    const available = result[grade];
    const toMove = Math.min(available, remaining);
    
    if (toMove > 0) {
      result[grade] -= toMove;
      const targetGrade = getGradeByIndex(i + levels);
      result[targetGrade] += toMove;
      remaining -= toMove;
    }
  }
  
  return result;
};

export const upgradeQuality = (
  quality: GoodsQuality,
  levels: number,
  quantityToUpgrade: number
): GoodsQuality => {
  const result = { ...quality };
  let remaining = quantityToUpgrade;
  
  for (let i = GRADE_ORDER.length - 1; i >= levels && remaining > 0; i--) {
    const grade = GRADE_ORDER[i];
    const available = result[grade];
    const toMove = Math.min(available, remaining);
    
    if (toMove > 0) {
      result[grade] -= toMove;
      const targetGrade = getGradeByIndex(i - levels);
      result[targetGrade] += toMove;
      remaining -= toMove;
    }
  }
  
  return result;
};

export const calculateTransportQualityDegradation = (
  commission: Commission,
  goods: Goods,
  weather: Weather,
  routeCondition: number,
  isOverloaded: boolean,
  eventDamage: number
): { quality: GoodsQuality; damageType: DamageType } => {
  const baseQuality = commission.quality || createInitialQuality(commission.quantity);
  const quantity = commission.quantity;
  
  const baseFragility = goods.fragility / 100;
  const weatherFactor = weather.damageChance * 0.8;
  const roadFactor = (1 - routeCondition) * 0.6;
  const overloadFactor = isOverloaded ? 0.3 : 0;
  const eventFactor = eventDamage / 100;
  
  const totalDegradationChance = Math.min(0.95,
    baseFragility * (1 + weatherFactor) * (1 + roadFactor) * (1 + overloadFactor) + eventFactor
  );
  
  const random = Math.random();
  
  if (random < totalDegradationChance) {
    const severity = Math.random();
    let downgradeLevels = 1;
    let downgradePercent = 0;
    
    if (severity < 0.5) {
      downgradeLevels = 1;
      downgradePercent = 0.2 + Math.random() * 0.3;
    } else if (severity < 0.8) {
      downgradeLevels = 2;
      downgradePercent = 0.15 + Math.random() * 0.25;
    } else {
      downgradeLevels = 3;
      downgradePercent = 0.1 + Math.random() * 0.2;
    }
    
    const quantityToDowngrade = Math.ceil(quantity * downgradePercent);
    const newQuality = downgradeQuality(baseQuality, downgradeLevels, quantityToDowngrade);
    
    const damageType = goods.damageTypes[0] || 'wear';
    
    return { quality: newQuality, damageType };
  }
  
  return { quality: baseQuality, damageType: goods.damageTypes[0] || 'wear' };
};

export const TREATMENT_OPTIONS: Record<TreatmentType, Omit<TreatmentOption, 'applicableGoods' | 'applicableFromGrades'>> = {
  'repack': {
    type: 'repack',
    name: '重新包装',
    description: '精心重新包装货物，防止进一步损坏，并略微提升品相',
    cost: 50,
    costPerUnit: false,
    targetGrade: 'good',
    reputationChange: 5,
  },
  'sun-dry': {
    type: 'sun-dry',
    name: '晾晒除潮',
    description: '将货物摊开晾晒，去除潮气，恢复部分品质',
    cost: 30,
    costPerUnit: false,
    targetGrade: 'good',
    reputationChange: 3,
  },
  'repair': {
    type: 'repair',
    name: '修补修复',
    description: '对有破损的货物进行修补，恢复部分品相',
    cost: 80,
    costPerUnit: false,
    targetGrade: 'fair',
    reputationChange: 8,
  },
  'discount-delivery': {
    type: 'discount-delivery',
    name: '折价交付',
    description: '告知委托方货物现状，折价交付，减少声望损失',
    cost: 0,
    costPerUnit: false,
    targetGrade: 'fair',
    reputationChange: 10,
  },
  'dust-clean': {
    type: 'dust-clean',
    name: '除尘清洁',
    description: '仔细清理货物表面灰尘，恢复光泽',
    cost: 25,
    costPerUnit: false,
    targetGrade: 'good',
    reputationChange: 3,
  },
};

export const getAvailableTreatments = (
  goods: Goods,
  currentGrade: QualityGrade
): TreatmentOption[] => {
  const treatments: TreatmentOption[] = [];
  
  const currentGradeIndex = getGradeIndex(currentGrade);
  if (currentGradeIndex <= 0) {
    return treatments;
  }
  
  for (const treatmentType of goods.defaultTreatments) {
    const baseOption = TREATMENT_OPTIONS[treatmentType];
    if (!baseOption) continue;
    
    const targetGradeIndex = getGradeIndex(baseOption.targetGrade);
    if (currentGradeIndex <= targetGradeIndex) continue;
    
    treatments.push({
      ...baseOption,
      applicableGoods: [goods.id],
      applicableFromGrades: GRADE_ORDER.filter((_, i) => i > targetGradeIndex),
    });
  }
  
  return treatments;
};

export const applyTreatment = (
  quality: GoodsQuality,
  treatment: TreatmentOption,
  _goods: Goods
): GoodsQuality => {
  const currentGrade = getCurrentQualityGrade(quality);
  const currentGradeIndex = getGradeIndex(currentGrade);
  const targetGradeIndex = getGradeIndex(treatment.targetGrade);
  
  if (currentGradeIndex <= targetGradeIndex) {
    return quality;
  }
  
  const upgradeLevels = currentGradeIndex - targetGradeIndex;
  const totalQuantity = getTotalQuantity(quality);
  const affectedQuantity = Math.ceil(totalQuantity * 0.6);
  
  return upgradeQuality(quality, upgradeLevels, affectedQuantity);
};

export const getTreatmentCost = (
  treatment: TreatmentOption,
  quantity: number,
  _goods: Goods
): number => {
  if (treatment.costPerUnit) {
    return treatment.cost * quantity;
  }
  return treatment.cost;
};

export const getGradeLabel = (grade: QualityGrade): string => {
  const labels: Record<QualityGrade, string> = {
    perfect: '完美',
    good: '良好',
    fair: '一般',
    poor: '较差',
    damaged: '破损',
  };
  return labels[grade];
};

export const getGradeColorClass = (grade: QualityGrade): string => {
  const colors: Record<QualityGrade, string> = {
    perfect: 'text-emerald-600',
    good: 'text-sky-600',
    fair: 'text-amber-600',
    poor: 'text-orange-600',
    damaged: 'text-red-600',
  };
  return colors[grade];
};

export const getGradeBgColorClass = (grade: QualityGrade): string => {
  const colors: Record<QualityGrade, string> = {
    perfect: 'bg-emerald-100',
    good: 'bg-sky-100',
    fair: 'bg-amber-100',
    poor: 'bg-orange-100',
    damaged: 'bg-red-100',
  };
  return colors[grade];
};

export const getDamageTypeLabel = (damageType: DamageType): string => {
  const labels: Record<DamageType, string> = {
    crack: '裂纹',
    damp: '受潮',
    dust: '染尘',
    break: '破损',
    mold: '霉变',
    wear: '磨损',
  };
  return labels[damageType];
};
