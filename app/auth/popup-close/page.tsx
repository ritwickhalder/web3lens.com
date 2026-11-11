import { pageMetadata } from '@/lib/metadata';
import { PopupClose } from './PopupClose';

export const metadata = pageMetadata({ title: 'Signing in', path: '/auth/popup-close', noindex: true, nofollow: true });

export default function PopupClosePage() {
  return <PopupClose />;
}
