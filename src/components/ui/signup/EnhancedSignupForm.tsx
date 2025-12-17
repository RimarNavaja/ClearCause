import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Building2,
  Heart,
  Loader2,
  CheckCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { config } from "@/lib/config";
import { signInWithGoogle } from "@/lib/auth";

interface UploadedDocuments {
  secCertificate: File | null;
  birCertificate: File | null;
  supportingDocument: File | null;
}

interface EnhancedSignupFormProps {
  // ... existing props
  accountType: "donor" | "charity";
  setAccountType: (type: "donor" | "charity") => void;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  agreeTerms: boolean;
  setAgreeTerms: (agree: boolean) => void;
  newsletterOpt: boolean;
  setNewsletterOpt: (opt: boolean) => void;
  error: string;
  success: boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  // Donor-specific fields
  donorCategory: "individual" | "organization";
  setDonorCategory: (category: "individual" | "organization") => void;
  donorOrganizationName?: string;
  setDonorOrganizationName?: (value: string) => void;
  donorOrganizationType?: string;
  setDonorOrganizationType?: (value: string) => void;
  // Charity-specific fields
  organizationName?: string;
  setOrganizationName?: (value: string) => void;
  registrationNumber?: string;
  setRegistrationNumber?: (value: string) => void;
  organizationType?: string;
  setOrganizationType?: (value: string) => void;
  contactPhone?: string;
  setContactPhone?: (value: string) => void;
  streetAddress?: string;
  setStreetAddress?: (value: string) => void;
  city?: string;
  setCity?: (value: string) => void;
  province?: string;
  setProvince?: (value: string) => void;
  postalCode?: string;
  setPostalCode?: (value: string) => void;
  missionStatement?: string;
  setMissionStatement?: (value: string) => void;
  uploadedDocuments?: UploadedDocuments;
  setUploadedDocuments?: (docs: UploadedDocuments) => void;
}

const EnhancedSignupForm: React.FC<EnhancedSignupFormProps> = ({
  // ... existing props
  accountType,
  setAccountType,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  agreeTerms,
  setAgreeTerms,
  newsletterOpt,
  setNewsletterOpt,
  error,
  success,
  isSubmitting,
  onSubmit,
  // Donor-specific props with defaults
  donorCategory,
  setDonorCategory,
  donorOrganizationName = "",
  setDonorOrganizationName = () => {},
  donorOrganizationType = "",
  setDonorOrganizationType = () => {},
  // Charity-specific props with defaults
  organizationName = "",
  setOrganizationName = () => {},
  registrationNumber = "",
  setRegistrationNumber = () => {},
  organizationType = "",
  setOrganizationType = () => {},
  contactPhone = "",
  setContactPhone = () => {},
  streetAddress = "",
  setStreetAddress = () => {},
  city = "",
  setCity = () => {},
  province = "",
  setProvince = () => {},
  postalCode = "",
  setPostalCode = () => {},
  missionStatement = "",
  setMissionStatement = () => {},
  uploadedDocuments = {
    secCertificate: null,
    birCertificate: null,
    supportingDocument: null,
  },
  setUploadedDocuments = () => {},
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [googleError, setGoogleError] = useState("");

  // Real-time validation
  const validateField = (field: string, value: string) => {
    // ... existing validation
    const errors = { ...fieldErrors };

    switch (field) {
      case "email":
        if (!value) {
          errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = "Please enter a valid email address";
        } else {
          delete errors.email;
        }
        break;
      case "password":
        if (!value) {
          errors.password = "Password is required";
        } else if (value.length < 8) {
          errors.password = "Password must be at least 8 characters";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          errors.password =
            "Password must contain uppercase, lowercase, and number";
        } else {
          delete errors.password;
        }
        break;
      case "confirmPassword":
        if (value !== password) {
          errors.confirmPassword = "Passwords do not match";
        } else {
          delete errors.confirmPassword;
        }
        break;
      case "firstName":
        if (!value.trim()) {
          errors.firstName = "First name is required";
        } else if (!/^[a-zA-Z\s\-\.\']+$/.test(value)) {
          errors.firstName = "First name contains invalid characters";
        } else {
          delete errors.firstName;
        }
        break;
      case "lastName":
        if (!value.trim()) {
          errors.lastName = "Last name is required";
        } else if (!/^[a-zA-Z\s\-\.\']+$/.test(value)) {
          errors.lastName = "Last name contains invalid characters";
        } else {
          delete errors.lastName;
        }
        break;
      case "donorOrganizationName":
        if (donorCategory === "organization" && !value.trim()) {
          errors.donorOrganizationName = "Organization name is required";
        } else {
          delete errors.donorOrganizationName;
        }
        break;
      case "donorOrganizationType":
        if (donorCategory === "organization" && !value) {
          errors.donorOrganizationType = "Organization type is required";
        } else {
          delete errors.donorOrganizationType;
        }
        break;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Get progress percentage
  const getProgress = () => {
    let fields = [firstName, lastName, email, password, confirmPassword];
    let totalFields = 6; // firstName, lastName, email, password, confirmPassword, agreeTerms

    if (accountType === "donor" && donorCategory === "organization") {
      fields = fields.concat([donorOrganizationName, donorOrganizationType]);
      totalFields += 2;
    }

    const completedFields = fields.filter(
      (field) => typeof field === "string" && field.trim() !== ""
    ).length;
    const termsChecked = agreeTerms ? 1 : 0;
    return ((completedFields + termsChecked) / totalFields) * 100;
  };

  // Handle file upload
  const handleFileUpload = (
    field: keyof UploadedDocuments,
    file: File | null
  ) => {
    setUploadedDocuments({
      ...uploadedDocuments,
      [field]: file,
    });
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleError("");
      const result = await signInWithGoogle();

      if (!result.success) {
        setGoogleError(result.error || "Google sign up failed. Please try again.");
      }
    } catch (error) {
      setGoogleError("Google sign up failed. Please try again.");
    }
  };

  // Role-specific content
  const getRoleContent = () => {
    // ... existing content
    if (accountType === "charity") {
      return {
        icon: <Building2 className="h-8 w-8 text-clearcause-primary" />,
        title: "Create Your Charity Account",
        subtitle: "Join our verified network of transparent organizations",
        benefits: [
          "Create transparent campaigns with milestone tracking",
          "Access to verification and credibility badges",
          "Real-time impact reporting tools",
          "Direct donor engagement platform",
        ],
        nextSteps: [
          "Complete organization verification process",
          "Upload required documentation",
          "Get reviewed by our team",
          "Start creating campaigns",
        ],
        estimatedTime: "5-10 business days for full verification",
      };
    } else {
      return {
        icon: <Heart className="h-8 w-8 text-clearcause-primary" />,
        title: "Create Your Donor Account",
        subtitle: "Start making transparent, trackable donations",
        benefits: [
          "Track the real impact of your donations",
          "Receive detailed progress updates",
          "Connect directly with beneficiaries",
          "Join a community of transparent giving",
        ],
        nextSteps: [
          "Verify your email address",
          "Explore campaigns that match your interests",
          "Make your first donation",
          "Track your impact in real-time",
        ],
        estimatedTime: "Start donating immediately after verification",
      };
    }
  };

  const roleContent = getRoleContent();

  return (
    <div className="max-w-3xl mx-auto font-poppinsregular">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Account Creation Progress</span>
          <span>{Math.round(getProgress())}% Complete</span>
        </div>
        <Progress value={getProgress()} className="h-2 bg-blue-200" />
      </div>

      <div className="flex max-w-3xl">
        {/* Form Section */}
        <div className="bg-white w-full shadow-lg rounded-lg p-6 md:p-8">
          <div className="flex flex-col justify-center items-center text-center mb-6 ">
            {/* <div className="flex justify-center mb-4">{roleContent.icon}</div> */}
            <img
              src="/CLEARCAUSE-logo.svg"
              alt="ClearCause"
              className="h-15 w-23 mb-6"
            />
            <h1 className="text-2xl font-bold text-gray-900 font-robotobold tracking-wide">
              {roleContent.title}
            </h1>
            <p className="text-gray-600 mt-2">{roleContent.subtitle}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
              <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {googleError && (
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
              <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{googleError}</span>
            </div>
          )}

          {success && (
            <div className="bg-blue-50 border border-blue-600 text-blue-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-start">
                <div>
                  <div className="font-medium">
                    Account created successfully!
                  </div>
                  <div className="text-sm mt-2 space-y-1">
                    <p>
                      We've sent a verification email to{" "}
                      <span className="font-medium">{email}</span>
                    </p>
                    <p>
                      <strong>Check your inbox spam folder</strong> for the
                      verification link.
                    </p>

                    <p>
                      Click the verification link to activate your account and
                      sign in.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Type Selector */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1.5 font-redhatbold">
            <button
              type="button"
              onClick={() => setAccountType("donor")}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-200 ${
                accountType === "donor"
                  ? "bg-blue-600  text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Donor
            </button>
            <button
              type="button"
              onClick={() => setAccountType("charity")}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-200 ${
                accountType === "charity"
                  ? "bg-blue-600  text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Organization
            </button>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            {/* Contact Person Section */}
            <div className="border-b pb-6">
              <h3 className="text-lg  text-gray-900 mb-4 flex items-center font-robotobold tracking-wide">
                Personal Information
              </h3>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="first-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First Name *
                  </label>
                  <input
                    id="first-name"
                    name="first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      validateField("firstName", e.target.value);
                    }}
                    onBlur={(e) => validateField("firstName", e.target.value)}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                      fieldErrors.firstName
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter your first name"
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="last-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Name *
                  </label>
                  <input
                    id="last-name"
                    name="last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      validateField("lastName", e.target.value);
                    }}
                    onBlur={(e) => validateField("lastName", e.target.value)}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                      fieldErrors.lastName
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter your last name"
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    validateField("email", e.target.value);
                  }}
                  onBlur={(e) => validateField("email", e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                    fieldErrors.email ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Enter your email address"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Donor Categorization Section (if accountType is donor) */}
            {accountType === "donor" && (
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center font-robotobold tracking-wide">
                  Donor Type
                </h3>
                <div className="flex space-x-4 mb-4">
                  <Card
                    className={`cursor-pointer w-1/2 ${
                      donorCategory === "individual"
                        ? "border-clearcause-primary ring-2 ring-clearcause-primary"
                        : "border-gray-300"
                    }`}
                    onClick={() => setDonorCategory("individual")}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <Heart className="h-6 w-6 text-clearcause-primary mb-2" />
                      <span className="text-sm font-medium">Individual</span>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer w-1/2 ${
                      donorCategory === "organization"
                        ? "border-clearcause-primary ring-2 ring-clearcause-primary"
                        : "border-gray-300"
                    }`}
                    onClick={() => setDonorCategory("organization")}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center">
                      <Building2 className="h-6 w-6 text-clearcause-primary mb-2" />
                      <span className="text-sm font-medium">Organization</span>
                    </CardContent>
                  </Card>
                </div>

                {donorCategory === "organization" && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label
                        htmlFor="donor-organization-name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Organization Name *
                      </label>
                      <input
                        id="donor-organization-name"
                        name="donor-organization-name"
                        type="text"
                        required
                        value={donorOrganizationName}
                        onChange={(e) =>
                          setDonorOrganizationName(e.target.value)
                        }
                        className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                          fieldErrors.donorOrganizationName
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter your organization's name"
                      />
                      {fieldErrors.donorOrganizationName && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.donorOrganizationName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="donor-organization-type"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Organization Type *
                      </label>
                      <select
                        id="donor-organization-type"
                        name="donor-organization-type"
                        required
                        value={donorOrganizationType}
                        onChange={(e) =>
                          setDonorOrganizationType(e.target.value)
                        }
                        className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                          fieldErrors.donorOrganizationType
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">Select an organization type</option>
                        <option value="corporation">Corporation</option>
                        <option value="foundation">Foundation</option>
                        <option value="ngo">NGO</option>
                        <option value="trust">Trust</option>
                        <option value="government_agency">
                          Government Agency
                        </option>
                        <option value="educational_institution">
                          Educational Institution
                        </option>
                        <option value="religious_organization">
                          Religious Organization
                        </option>
                        <option value="other">Other</option>
                      </select>
                      {fieldErrors.donorOrganizationType && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.donorOrganizationType}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password Fields */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 font-robotobold tracking-wide">
                Account Credentials
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        validateField("password", e.target.value);
                        if (confirmPassword) {
                          validateField("confirmPassword", confirmPassword);
                        }
                      }}
                      onBlur={(e) => validateField("password", e.target.value)}
                      className={`appearance-none block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                        fieldErrors.password
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.password}
                    </p>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    Must contain at least 8 characters with uppercase,
                    lowercase, and number
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm Password *
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      validateField("confirmPassword", e.target.value);
                    }}
                    onBlur={(e) =>
                      validateField("confirmPassword", e.target.value)
                    }
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary ${
                      fieldErrors.confirmPassword
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Confirm your password"
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="agree-terms"
                    name="agree-terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="h-4 w-4 text-clearcause-primary focus:ring-clearcause-primary border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="agree-terms" className="text-gray-700">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="text-clearcause-primary hover:text-clearcause-secondary font-medium"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="text-clearcause-primary hover:text-clearcause-secondary font-medium"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 px-4 text-base font-redhatbold"
                disabled={
                  isSubmitting || success || Object.keys(fieldErrors).length > 0
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Account Created
                  </>
                ) : (
                  <>
                    Create{" "}
                    {accountType === "charity" ? "Organization" : "Donor"}{" "}
                    Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {config.features.socialLogin && (
            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.78 15.71 17.55V20.25H19.28C21.36 18.31 22.56 15.57 22.56 12.25Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23C14.97 23 17.46 22.01 19.28 20.25L15.71 17.55C14.73 18.19 13.48 18.58 12 18.58C9.09 18.58 6.63 16.65 5.72 14.04H2.05V16.82C3.87 20.42 7.62 23 12 23Z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.72 14.04C5.5 13.41 5.37 12.73 5.37 12.01C5.37 11.29 5.5 10.61 5.72 9.98002V7.20002H2.05C1.23 8.95002 0.77 10.92 0.77 12.01C0.77 13.1 1.23 15.07 2.05 16.82L5.72 14.04Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.42C13.62 5.42 15.06 5.99 16.21 7.07L19.36 3.92C17.45 2.14 14.97 1 12 1C7.62 1 3.87 3.58 2.05 7.18L5.72 9.96C6.63 7.35 9.09 5.42 12 5.42Z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account?</span>
            <Link
              to="/login"
              className="ml-1 font-medium text-blue-700 hover:text-blue-600 transform transition-transform duration-200 ease-out hover:scale-110 inline-block"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Information Panel */}
        {/* <div className="space-y-6">
          {accountType === "charity" && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-amber-900 mb-2 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Important for Organizations
                </h3>
                <p className="text-sm text-amber-800 mb-3">
                  As a registered charity or nonprofit organization, you'll need
                  to provide:
                </p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Organization registration documents</li>
                  <li>• Tax-exempt status proof</li>
                  <li>• Leadership contact information</li>
                  <li>• Mission statement and program details</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div> */}
      </div>
    </div>
  );
};

export default EnhancedSignupForm;
