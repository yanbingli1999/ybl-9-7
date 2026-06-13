import { X, Sparkles, Coins, Star, Package, TrendingUp } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import {
  getAvailableTreatments,
  getQualityStage,
  getCurrentQualityGrade,
  getGradeLabel,
  getGradeColorClass,
  getGradeBgColorClass,
  getTreatmentCost,
} from '../../utils/qualitySystem';
import type { GoodsQuality, TreatmentOption } from '../../../shared/types';

const TreatmentModal = () => {
  const {
    showTreatmentModal,
    treatmentCommissionId,
    commissions,
    goodsList,
    player,
    closeTreatmentModal,
    applyTreatmentToCommission,
  } = useGameStore();

  if (!showTreatmentModal || !treatmentCommissionId) return null;

  const commission = commissions.find(c => c.id === treatmentCommissionId);
  const goods = goodsList.find(g => g.id === commission?.goodsId);

  if (!commission || !goods || !commission.quality) return null;

  const currentGrade = getCurrentQualityGrade(commission.quality);
  const currentStage = getQualityStage(goods, currentGrade);
  const availableTreatments = getAvailableTreatments(goods, currentGrade);

  const handleApplyTreatment = (treatment: TreatmentOption) => {
    applyTreatmentToCommission(treatment);
  };

  const renderQualityBars = (quality: GoodsQuality) => {
    const total = quality.perfect + quality.good + quality.fair + quality.poor + quality.damaged;
    if (total === 0) return null;

    const grades = [
      { key: 'perfect' as const, label: '完美', color: 'bg-emerald-500' },
      { key: 'good' as const, label: '良好', color: 'bg-sky-500' },
      { key: 'fair' as const, label: '一般', color: 'bg-amber-500' },
      { key: 'poor' as const, label: '较差', color: 'bg-orange-500' },
      { key: 'damaged' as const, label: '破损', color: 'bg-red-500' },
    ];

    return (
      <div className="space-y-2">
        {grades.map(grade => {
          const count = quality[grade.key];
          const percent = total > 0 ? (count / total) * 100 : 0;
          if (count === 0) return null;
          return (
            <div key={grade.key} className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-12">{grade.label}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${grade.color} rounded-full transition-all duration-500`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 w-16 text-right">
                {count} 件 ({percent.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">货物养护</h3>
                <p className="text-white/80 text-sm">选择处理方式，恢复货物品相</p>
              </div>
            </div>
            <button
              onClick={closeTreatmentModal}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{goods.icon}</span>
              <div>
                <div className="font-semibold text-slate-800">{goods.name}</div>
                <div className="text-sm text-slate-500">数量: {commission.quantity} 件</div>
              </div>
              <div className="ml-auto text-right">
                <div className={`text-sm font-medium ${getGradeColorClass(currentGrade)}`}>
                  当前品相
                </div>
                <div className={`text-lg font-bold ${getGradeColorClass(currentGrade)}`}>
                  {currentStage?.name || getGradeLabel(currentGrade)}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-2">品相分布</p>
              {renderQualityBars(commission.quality)}
            </div>

            {currentStage && (
              <div className={`p-3 rounded-lg ${getGradeBgColorClass(currentGrade)}`}>
                <p className="text-sm text-slate-700">{currentStage.description}</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              可用处理方式
            </h4>

            {availableTreatments.length === 0 ? (
              <div className="text-center py-6 bg-emerald-50 rounded-xl">
                <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-700 font-medium">货物品相完好，无需处理</p>
                <p className="text-sm text-emerald-600 mt-1">保持当前状态交付即可</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableTreatments.map(treatment => {
                  const cost = getTreatmentCost(treatment, commission.quantity, goods);
                  const canAfford = player.gold >= cost;
                  const targetStage = getQualityStage(goods, treatment.targetGrade);

                  return (
                    <div
                      key={treatment.type}
                      className={`border rounded-xl p-4 transition-all ${
                        canAfford
                          ? 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                          : 'border-slate-200 bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-slate-800">{treatment.name}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {treatment.description}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-amber-600 font-semibold">
                            <Coins className="w-4 h-4" />
                            ¥{cost}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-3 text-xs">
                        <div className="flex items-center gap-1 text-slate-500">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          <span>目标品相: </span>
                          <span className={getGradeColorClass(treatment.targetGrade)}>
                            {targetStage?.name || getGradeLabel(treatment.targetGrade)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <Star className="w-3 h-3 text-amber-500" />
                          <span>声望 </span>
                          <span className="text-emerald-600">+{treatment.reputationChange}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyTreatment(treatment)}
                        disabled={!canAfford}
                        className={`w-full py-2 rounded-lg font-medium text-sm transition-all ${
                          canAfford
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? '立即处理' : '金币不足'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              💡 提示：处理货物可以恢复部分品相，提高交付时的收益和声望。但需要花费金币，请根据实际情况权衡。
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={closeTreatmentModal}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreatmentModal;
