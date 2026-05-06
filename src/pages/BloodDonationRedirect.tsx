import { useEffect } from "react";

const BloodDonationRedirect = () => {
  useEffect(() => {
    window.location.replace("/blood_donation_ui.html");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Opening blood donation interface...</p>
    </div>
  );
};

export default BloodDonationRedirect;
