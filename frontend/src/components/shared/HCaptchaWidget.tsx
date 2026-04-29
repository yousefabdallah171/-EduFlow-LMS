import HCaptcha from "@hcaptcha/react-hcaptcha";

interface HCaptchaWidgetProps {
  captchaRequired: boolean;
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export const HCaptchaWidget = ({ captchaRequired, onVerify, onExpire }: HCaptchaWidgetProps) => {
  if (!captchaRequired) {
    return null;
  }

  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

  if (!siteKey) {
    return (
      <button
        type="button"
        className="rounded-xl border px-4 py-2 text-sm font-semibold"
        onClick={() => onVerify("dev-hcaptcha-bypass-token")}
      >
        Dev CAPTCHA bypass
      </button>
    );
  }

  return (
    <HCaptcha
      sitekey={siteKey}
      onVerify={onVerify}
      onExpire={onExpire}
    />
  );
};
