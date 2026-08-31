import React from "react";
import { Input } from "@/components/ui/input";

export interface StandardInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Standard Phone Number Input Component (10 Digits Numeric)
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, StandardInputProps>(
  ({ value, onChange, placeholder = "10-digit phone number", className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className={className}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput";

/**
 * Standard Aadhar Card Input Component (12 Digits Numeric)
 */
export const AadharInput = React.forwardRef<HTMLInputElement, StandardInputProps>(
  ({ value, onChange, placeholder = "12-digit Aadhar number", className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={12}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 12))}
        className={className}
        {...props}
      />
    );
  }
);
AadharInput.displayName = "AadharInput";

/**
 * Standard PIN Code Input Component (6 Digits Numeric)
 */
export const PincodeInput = React.forwardRef<HTMLInputElement, StandardInputProps>(
  ({ value, onChange, placeholder = "6-digit Pincode", className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className={className}
        {...props}
      />
    );
  }
);
PincodeInput.displayName = "PincodeInput";

/**
 * Standard Date of Birth Input Component (Disabled Future Dates)
 */
export const DOBInput = React.forwardRef<HTMLInputElement, StandardInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const today = new Date().toISOString().split("T")[0];
    return (
      <Input
        ref={ref}
        type="date"
        max={today}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        {...props}
      />
    );
  }
);
DOBInput.displayName = "DOBInput";
