"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

const passwordStrengthSchema = z.object({
  length: z.boolean(),
  uppercase: z.boolean(),
  lowercase: z.boolean(),
  number: z.boolean(),
  specialChar: z.boolean(),
});

type PasswordStrength = z.infer<typeof passwordStrengthSchema>;

const getPasswordStrength = (password: string): PasswordStrength => {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[\W_]/.test(password), 
  };
};

const calculateStrengthScore = (strength: PasswordStrength): number => {
  return Object.values(strength).filter(Boolean).length * 20;
};

const baseSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const registerSchema = baseSchema.extend({
  confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
  role: z.enum(["buyer", "seller", "admin"], {
    required_error: "You need to select a role.",
  }),
  contactName: z.string().min(2, { message: "Contact name must be at least 2 characters."}),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits."}).regex(/^\+?[0-9\s-()]*$/, "Invalid phone number format."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
}).refine((data) => {
  const strength = getPasswordStrength(data.password);
  return calculateStrengthScore(strength) >= 80; 
}, {
  message: "Password is not strong enough. Ensure it has uppercase, lowercase, number, special character, and is at least 8 characters long.",
  path: ["password"],
});


const loginSchema = baseSchema;

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (values: any) => Promise<void>; // eslint-disable-line @typescript-eslint/no-explicit-any
  loading: boolean;
}

export default function AuthForm({ mode, onSubmit, loading }: AuthFormProps) {
  const schema = mode === "register" ? registerSchema : loginSchema;
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: mode === 'register' ? {
      email: "",
      password: "",
      confirmPassword: "",
      role: "buyer" as "buyer" | "seller" | "admin",
      contactName: "",
      phoneNumber: "",
    } : {
      email: "",
      password: "",
    },
  });

  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(
    getPasswordStrength("")
  );
  const [strengthScore, setStrengthScore] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  useEffect(() => {
    if (mode === "register") {
      const strength = getPasswordStrength(password);
      setPasswordStrength(strength);
      setStrengthScore(calculateStrengthScore(strength));
    }
  }, [password, mode]);
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    form.setValue("password", newPassword, { shouldValidate: true }); 
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const strengthText = () => {
    if (strengthScore < 40) return "Weak";
    if (strengthScore < 80) return "Medium";
    return "Strong";
  };
  
  const strengthColor = () => {
    if (strengthScore < 40) return "bg-red-500";
    if (strengthScore < 80) return "bg-yellow-500";
    return "bg-green-500";
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => ( 
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                 <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    {...field} 
                    value={password} // Ensure this field is also controlled for strength check
                    onChange={handlePasswordChange} 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={toggleShowPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === "register" && (
          <>
            <div className="space-y-2">
              <Progress value={strengthScore} className={`w-full h-2 ${strengthColor()}`} aria-label={`Password strength: ${strengthScore}%`} />
              <p className={`text-xs ${strengthScore < 40 ? 'text-red-500' : strengthScore < 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                Password strength: {strengthText()}
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li className={passwordStrength.length ? "text-green-600" : ""}>At least 8 characters</li>
                <li className={passwordStrength.uppercase ? "text-green-600" : ""}>At least one uppercase letter</li>
                <li className={passwordStrength.lowercase ? "text-green-600" : ""}>At least one lowercase letter</li>
                <li className={passwordStrength.number ? "text-green-600" : ""}>At least one number</li>
                <li className={passwordStrength.specialChar ? "text-green-600" : ""}>At least one special character</li>
              </ul>
            </div>
            
             <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                     <div className="relative">
                        <Input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            {...field} 
                        />
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={toggleShowConfirmPassword}
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name / Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe or ABC Oxygen Supply" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1 123 456 7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>I am a...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="buyer" id="role-buyer"/>
                        </FormControl>
                        <FormLabel htmlFor="role-buyer" className="font-normal cursor-pointer">
                          Buyer (Looking for cylinders)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="seller" id="role-seller"/>
                        </FormControl>
                        <FormLabel htmlFor="role-seller" className="font-normal cursor-pointer">
                          Seller (Providing cylinders)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="admin" id="role-admin"/>
                        </FormControl>
                        <FormLabel htmlFor="role-admin" className="font-normal cursor-pointer">
                          Administrator
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* License upload for sellers */}
            {form.watch('role') === 'seller' && (
              <FormItem>
                <FormLabel>Upload License/Certificate (PDF, JPG, PNG)</FormLabel>
                <FormControl>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => form.setValue('licenseFile', e.target.files?.[0])} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          </>
        )}

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "register" ? "Create Account" : "Sign In"}
        </Button>

        {mode === "login" && (
             <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                    Register
                </Link>
            </p>
        )}
      </form>
    </Form>
  );
}
