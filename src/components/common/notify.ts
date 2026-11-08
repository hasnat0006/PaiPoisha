// The one way to show a success or error toast (user, 2026-11-08): success 2 s, errors 5 s.
// Colours, the × and the position come from <Toaster> (components/ui/sonner.tsx).
import { toast, type ExternalToast } from "sonner";

export const notify = {
  success: (message: string, opts?: ExternalToast) => {
    toast.dismiss("validation"); // the mistake it described is fixed now
    return toast.success(message, { duration: 2000, ...opts });
  },
  error: (message: string, opts?: ExternalToast) => toast.error(message, { duration: 5000, ...opts }),
  /** A form mistake, repeating the inline message. One id: tapping Save again replaces it instead of stacking. */
  invalid: (message: string) => toast.error(message, { duration: 5000, id: "validation" }),
};
