import { rewardsAccount, pointsActivity, rewardsTools } from '@/lib/bank/rewards';
import PointsDemo from './PointsDemo';

export default function Page() {
  return (
    <PointsDemo
      account={rewardsAccount}
      activity={pointsActivity}
      offers={rewardsTools.get_current_offers().offers}
    />
  );
}
