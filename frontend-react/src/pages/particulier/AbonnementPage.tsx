import { CheckCircle, Zap, Star, Crown, Package } from 'lucide-react';
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

const planIcon = (slug: string) => {
  if (slug === 'decouverte') return <Zap className="w-6 h-6 text-gray-500" />;
  if (slug === 'pro') return <Star className="w-6 h-6 text-amber-500" />;
  return <Crown className="w-6 h-6 text-purple-500" />;
};

const planFeatures = (features: string): string[] => {
  if (!features) return [];
  try { return JSON.parse(features); } catch { return features.split(',').map(f => f.trim()).filter(Boolean); }
};

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

  return (
    <DashboardLayout sidebarItems={sidebar} title={t('subscription.title')}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('subscription.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('subscription.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="card bg-primary-50 border-primary-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('subscription.listing_limit')}</p>
                  <p className="text-2xl font-bold text-primary-700 mt-0.5">{listingLimit} <span className="text-sm font-normal text-gray-500">{t('subscription.listings_total')}</span></p>
                  {listingLimit > baseLimit && (
                    <p className="text-xs text-primary-600 mt-1">
                      {baseLimit} {t('subscription.base')} + {listingLimit - baseLimit} {t('subscription.bonus_from_subs')}
                    </p>
                  )}
                </div>
                <Package className="w-8 h-8 text-primary-400" />
              </div>
            </div>

            {activeSubs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('subscription.active_subs')}</h2>
                <div className="space-y-2">
                  {activeSubs.map((sub) => (
                    <div key={sub.id} className="card flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">{sub.plan}</p>
                          {sub.expires_at && (
                            <p className="text-xs text-gray-500">{t('subscription.expires')} {new Date(sub.expires_at).toLocaleDateString('fr-FR')}</p>
                          )}
                        </div>
                      </div>
                      {sub.max_listings_bonus > 0 && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                          +{sub.max_listings_bonus} {t('subscription.listings')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('subscription.available_plans')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {plans.map((plan, idx) => (
                  <div key={plan.id} className={clsx('card relative border-2 transition-all',
                    idx === 1 ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200'
                  )}>
                    {idx === 1 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          {t('subscription.popular')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                        {planIcon(plan.slug)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {plan.price === 0 ? t('subscription.free') : `${plan.price}€${t('subscription.monthly')}`}
                        </p>
                      </div>
                    </div>

                    {plan.max_listings_bonus > 0 && (
                      <div className="mb-3 flex items-center gap-1.5 text-sm text-primary-700 font-medium">
                        <Package className="w-4 h-4" />
                        +{plan.max_listings_bonus} {t('subscription.listings')}
                      </div>
                    )}

                    <ul className="space-y-2 mb-5">
                      {planFeatures(plan.features).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className={clsx('w-full py-2 rounded-md text-sm font-medium transition-colors',
                        idx === 1
                          ? 'bg-primary-500 text-white hover:bg-primary-600'
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {plan.price === 0 ? t('subscription.choose') : t('subscription.subscribe')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('subscription.change_to', { name: selectedPlan.name })}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {selectedPlan.price === 0
                ? t('subscription.downgrade_msg')
                : t('subscription.upgrade_msg', { price: selectedPlan.price })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedPlan(null)}
                className="btn-secondary"
                disabled={stripeLoading || freeSubMutation.isPending}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleConfirmPlan(selectedPlan)}
                disabled={freeSubMutation.isPending || stripeLoading}
                className="btn-primary"
              >
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
