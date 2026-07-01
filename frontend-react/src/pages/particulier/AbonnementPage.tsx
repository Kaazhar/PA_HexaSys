import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { proSidebar, adminSidebar } from '../../config/sidebars';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { subscriptionService, stripeService } from '../../services/api';
import type { SubscriptionPlan } from '../../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, X, Loader2, Zap, Star, Rocket } from 'lucide-react';

const planFeatures = (features: string): string[] => {
  if (!features) return [];
  try { return JSON.parse(features); } catch { return features.split(',').map(f => f.trim()).filter(Boolean); }
};

const PLAN_STYLES = [
  {
    icon: <Zap className="w-5 h-5" />,
    gradient: 'from-gray-50 to-gray-100',
    iconBg: 'bg-gray-200 text-gray-600',
    badge: '',
    ring: 'border-gray-200',
    btn: 'bg-gray-800 hover:bg-gray-900 text-white',
  },
  {
    icon: <Star className="w-5 h-5" />,
    gradient: 'from-[#2D5016] to-[#3a6a1e]',
    iconBg: 'bg-white/20 text-white',
    badge: 'Populaire',
    ring: 'border-[#2D5016] ring-4 ring-[#2D5016]/10',
    btn: 'bg-[#C97664] hover:bg-[#b8604f] text-white',
  },
  {
    icon: <Rocket className="w-5 h-5" />,
    gradient: 'from-[#1a3a8f] to-[#2a4db0]',
    iconBg: 'bg-white/20 text-white',
    badge: '',
    ring: 'border-[#1a3a8f]/40',
    btn: 'bg-[#1a3a8f] hover:bg-[#152d70] text-white',
  },
];

export default function AbonnementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sidebar = user?.role === 'admin' ? adminSidebar : proSidebar;
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.getPlans(),
  });

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => subscriptionService.getMy(),
  });

  const plans = plansData?.data ?? [];
  const activeSubs = myData?.data?.subscriptions ?? [];
  const listingLimit = myData?.data?.listing_limit ?? 5;
  const baseLimit = myData?.data?.base_limit ?? 5;

  const freeSubMutation = useMutation({
    mutationFn: (slug: string) => subscriptionService.subscribeFree(slug),
    onSuccess: () => {
      toast.success(t('subscription.updated'));
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || t('common.error'));
    },
  });

  const handleConfirmPlan = async (plan: SubscriptionPlan) => {
    if (plan.price === 0) {
      freeSubMutation.mutate(plan.slug);
    } else {
      setStripeLoading(true);
      try {
        const res = await stripeService.createSubscriptionCheckout(plan.slug);
        window.location.href = res.data.checkout_url;
      } catch (err: any) {
        toast.error(err?.response?.data?.error || t('subscription.payment_error'));
        setStripeLoading(false);
      }
    }
  };

  const isLoading = plansLoading || myLoading;
  const bonusListings = listingLimit - baseLimit;

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('subscription.title')}>
      <div className="space-y-8">

        <div className="rounded-2xl bg-gradient-to-br from-[#2D5016] to-[#4a7a28] p-6 text-white">
          <p className="text-sm font-medium text-white/70 mb-1">{t('subscription.listing_limit')}</p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black">{listingLimit}</span>
            <span className="text-white/70 text-sm mb-1.5">{t('subscription.listings_total')}</span>
          </div>
          {bonusListings > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-green-300" />
              {baseLimit} {t('subscription.base')} + {bonusListings} {t('subscription.bonus_from_subs')}
            </div>
          )}
        </div>

        {activeSubs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('subscription.active_subs')}</p>
            {activeSubs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{sub.plan}</p>
                    {sub.expires_at && (
                      <p className="text-xs text-gray-500">{t('subscription.expires')} {new Date(sub.expires_at).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </div>
                {sub.max_listings_bonus > 0 && (
                  <span className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-semibold">
                    +{sub.max_listings_bonus} {t('subscription.listings')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('subscription.available_plans')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {plans.map((plan, idx) => {
                const style = PLAN_STYLES[idx] ?? PLAN_STYLES[0];
                const isPopular = idx === 1;
                const features = planFeatures(plan.features);

                return (
                  <div key={plan.id} className={clsx('relative rounded-2xl border-2 overflow-hidden transition-all duration-200 hover:shadow-lg', style.ring)}>

                    {isPopular && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="bg-[#C97664] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          {t('subscription.popular')}
                        </span>
                      </div>
                    )}

                    <div className={clsx('p-5 bg-gradient-to-br', style.gradient, isPopular ? 'text-white' : 'text-gray-800')}>
                      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center mb-3', style.iconBg)}>
                        {style.icon}
                      </div>
                      <p className={clsx('font-bold text-lg', isPopular ? 'text-white' : 'text-gray-900')}>{plan.name}</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        {plan.price === 0 ? (
                          <span className={clsx('text-3xl font-black', isPopular ? 'text-white' : 'text-gray-900')}>{t('subscription.free')}</span>
                        ) : (
                          <>
                            <span className={clsx('text-3xl font-black', isPopular ? 'text-white' : 'text-gray-900')}>{plan.price}€</span>
                            <span className={clsx('text-sm', isPopular ? 'text-white/70' : 'text-gray-500')}>{t('subscription.monthly')}</span>
                          </>
                        )}
                      </div>
                      {plan.max_listings_bonus > 0 && (
                        <div className={clsx('mt-2 text-xs font-semibold', isPopular ? 'text-white/80' : 'text-[#2D5016]')}>
                          +{plan.max_listings_bonus} {t('subscription.listings')}
                        </div>
                      )}
                    </div>

                    <div className="p-5 bg-white space-y-4">
                      {features.length > 0 && (
                        <ul className="space-y-2.5">
                          {features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                              <CheckCircle className="w-4 h-4 text-[#2D5016] mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <button
                        onClick={() => setSelectedPlan(plan)}
                        className={clsx('w-full py-2.5 rounded-xl text-sm font-semibold transition-colors', style.btn)}
                      >
                        {plan.price === 0 ? t('subscription.choose') : t('subscription.subscribe')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t('subscription.change_to', { name: selectedPlan.name })}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedPlan.price === 0 ? t('subscription.downgrade_msg') : t('subscription.upgrade_msg', { price: selectedPlan.price })}
                </p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="text-gray-400 hover:text-gray-600 mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPlan.price > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{selectedPlan.name}</span>
                  <span>{selectedPlan.price} €</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>TVA (20%)</span>
                  <span>{(selectedPlan.price * 0.2).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Total TTC</span>
                  <span>{(selectedPlan.price * 1.2).toFixed(2)} €</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPlan(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={stripeLoading || freeSubMutation.isPending}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleConfirmPlan(selectedPlan)}
                disabled={freeSubMutation.isPending || stripeLoading}
                className="flex-1 py-2.5 bg-[#2D5016] hover:bg-[#3a6a1e] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {(freeSubMutation.isPending || stripeLoading) && <Loader2 className="w-4 h-4 animate-spin" />}
                {(freeSubMutation.isPending || stripeLoading)
                  ? t('common.loading')
                  : selectedPlan.price === 0
                    ? t('subscription.confirm')
                    : t('subscription.pay_monthly', { price: selectedPlan.price })}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
