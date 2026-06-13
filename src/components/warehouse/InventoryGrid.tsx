import { Package, AlertCircle, Sparkles, Tag } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import {
  getCurrentQualityGrade,
  getQualityStage,
  getGradeColorClass,
  getGradeBgColorClass,
  getDamageTypeLabel,
  isAllPerfect,
} from '../../utils/qualitySystem';
import type { Commission, Goods } from '../../../shared/types';

interface InventoryGridProps {
  commissions: Commission[];
  goodsList: Goods[];
}

const InventoryGrid = ({ commissions, goodsList }: InventoryGridProps) => {
  const { openTreatmentModal, selectedCommissions, selectCommission } = useGameStore();
  const acceptedCommissions = commissions.filter(c => c.isAccepted && !c.isCompleted);

  const getGoodsInfo = (goodsId: string) => {
    return goodsList.find(g => g.id === goodsId);
  };

  const getFragilityColor = (fragility: number) => {
    if (fragility >= 80) return 'text-red-600';
    if (fragility >= 50) return 'text-amber-600';
    return 'text-green-600';
  };

  const getFragilityLabel = (fragility: number) => {
    if (fragility >= 80) return '极易碎';
    if (fragility >= 50) return '易碎';
    return '普通';
  };

  const getQualityInfo = (commission: Commission, goods: Goods | undefined) => {
    if (!commission.quality || !goods) return null;
    const grade = getCurrentQualityGrade(commission.quality);
    const stage = getQualityStage(goods, grade);
    return { grade, stage };
  };

  const renderQualityMiniBars = (commission: Commission) => {
    if (!commission.quality) return null;
    const quality = commission.quality;
    const total = quality.perfect + quality.good + quality.fair + quality.poor + quality.damaged;
    if (total === 0) return null;

    const grades = [
      { key: 'perfect' as const, color: 'bg-emerald-500' },
      { key: 'good' as const, color: 'bg-sky-500' },
      { key: 'fair' as const, color: 'bg-amber-500' },
      { key: 'poor' as const, color: 'bg-orange-500' },
      { key: 'damaged' as const, color: 'bg-red-500' },
    ];

    return (
      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
        {grades.map(grade => {
          const count = quality[grade.key];
          if (count === 0) return null;
          const percent = (count / total) * 100;
          return (
            <div
              key={grade.key}
              className={`${grade.color} transition-all duration-300`}
              style={{ width: `${percent}%` }}
            />
          );
        })}
      </div>
    );
  };

  const handleCardClick = (commissionId: string, isShipped: boolean | undefined) => {
    if (!isShipped) {
      selectCommission(commissionId);
    }
  };

  const handleTreatmentClick = (e: React.MouseEvent, commissionId: string) => {
    e.stopPropagation();
    openTreatmentModal(commissionId);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5">
      <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-indigo-500" />
        库存货物 ({acceptedCommissions.length})
      </h3>

      {acceptedCommissions.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">仓库暂无货物</p>
          <p className="text-sm text-slate-400 mt-1">去港口大厅承接委托吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {acceptedCommissions.map(commission => {
            const goods = getGoodsInfo(commission.goodsId);
            const qualityInfo = getQualityInfo(commission, goods);
            const isSelected = selectedCommissions.includes(commission.id);
            const isShipped = commission.isShipped;
            const needsTreatment = commission.quality && !isAllPerfect(commission.quality);

            return (
              <div
                key={commission.id}
                onClick={() => handleCardClick(commission.id, isShipped)}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                } ${isShipped ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{goods?.icon || '📦'}</span>
                    <div>
                      <div className="font-medium text-slate-800">
                        {commission.goodsName}
                      </div>
                      <div className="text-xs text-slate-500">
                        数量: {commission.quantity}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-amber-600">
                      ¥{commission.reward}
                    </div>
                    <div className={`text-xs flex items-center gap-1 justify-end ${getFragilityColor(goods?.fragility || 1)}`}>
                      <AlertCircle className="w-3 h-3" />
                      {getFragilityLabel(goods?.fragility || 1)}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">品相</span>
                    {qualityInfo && qualityInfo.stage && (
                      <span className={`text-xs font-medium ${getGradeColorClass(qualityInfo.grade)}`}>
                        {qualityInfo.stage.name}
                      </span>
                    )}
                  </div>
                  {renderQualityMiniBars(commission)}
                </div>

                {commission.damageType && (
                  <div className={`text-xs mb-2 px-2 py-1 rounded ${getGradeBgColorClass(qualityInfo?.grade || 'fair')}`}>
                    <span className="text-slate-600">
                      损坏类型: {getDamageTypeLabel(commission.damageType)}
                    </span>
                  </div>
                )}

                <div className="text-xs text-slate-500">
                  目的地: {commission.destinationName}
                </div>
                {commission.deadlineHours && (
                  <div className="text-xs text-slate-400 mt-1">
                    期限: {commission.deadlineHours} 小时
                  </div>
                )}

                {commission.hasBeenTreated && (
                  <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    已养护
                  </div>
                )}

                {commission.isDiscounted && (
                  <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    已折价
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  {needsTreatment && !isShipped && (
                    <button
                      onClick={(e) => handleTreatmentClick(e, commission.id)}
                      className="flex-1 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      货物养护
                    </button>
                  )}
                  {!needsTreatment && !isShipped && (
                    <div className="flex-1 py-1.5 bg-emerald-100 text-emerald-600 text-xs font-medium rounded-lg text-center">
                      品相完好
                    </div>
                  )}
                  {isShipped && (
                    <div className="flex-1 py-1.5 bg-slate-200 text-slate-500 text-xs font-medium rounded-lg text-center">
                      运输中
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
