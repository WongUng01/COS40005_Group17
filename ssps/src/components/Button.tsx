// type ButtonProps = {
//   children: React.ReactNode;
//   onClick?: () => void;
//   className?: string;
// };

// const Button = ({ children, onClick, className = '' }: ButtonProps) => {
//   return (
//     <button
//       onClick={onClick}
//       className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded ${className}`}
//     >
//       {children}
//     </button>
//   );
// };

// export default Button;

import { cn } from "@/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "destructive" ;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center px-4 py-2 rounded-2xl text-sm font-medium transition-colors focus:outline-none",
          variant === "default" && "bg-red-600 text-white hover:bg-red-700",
          variant === "outline" &&
            "border border-gray-300 text-gray-700 hover:bg-gray-100",
          variant === "destructive" &&
            "bg-red-600 text-white hover:bg-red-700",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";