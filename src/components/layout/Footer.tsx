import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 mt-5">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center">
              <img src="/CLEARCAUSE-logo.svg" alt="ClearCause" className="h-9 w-auto" />
            </Link>
            <p className="mt-4 text-sm text-gray-500 font-poppinsregular">
              Donate with confidence. Track every dollar, see the impact, in
              real time.
            </p>
            <div className="flex space-x-4 mt-6">
              <a
                href="#"
                className="text-blue-400 hover:text-clearcause-primary"
              >
                <Facebook size={20} />
              </a>
              <a
                href="#"
                className="text-blue-400 hover:text-clearcause-primary"
              >
                <Twitter size={20} />
              </a>
              <a
                href="#"
                className="text-blue-400 hover:text-clearcause-primary"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="text-blue-400 hover:text-clearcause-primary"
              >
                <Youtube size={20} />
              </a>
            </div>
          </div>

          <div className="col-span-1 font-poppinsregular">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Platform
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/campaigns"
                  className="text-base text-gray-500 hover:text-clearcause-primary"
                >
                  Browse Campaigns
                </Link>
              </li>
              <li>
                <Link
                  to="/how-it-works"
                  className="text-base text-gray-500 hover:text-clearcause-primary"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  to="/for-charities"
                  className="text-base text-gray-500 hover:text-clearcause-primary"
                >
                  For Charities
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-base text-gray-500 hover:text-clearcause-primary"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-1 font-poppinsregular">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Support
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/faq"
                  className="text-base text-gray-500 hover:text-clearcause-primary"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-base text-gray-500 hover:text-clearcause-primary"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-base text-gray-500 hover:text-clearcause-primary"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-base text-gray-500 hover:text-clearcause-primary"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-1 font-poppinsregular">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Subscribe
            </h3>
            <p className="mt-4 text-sm text-gray-500">
              Stay updated with our newsletter
            </p>
            <form className="mt-4">
              <div className="flex flex-col sm:flex-row">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="appearance-none min-w-0 w-full bg-white border border-gray-300 rounded-md py-2 px-4 text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary focus:placeholder-gray-400"
                />
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center font-redhatbold border border-transparent rounded-md py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clearcause-primary"
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-base text-gray-400 text-center">
            &copy; {new Date().getFullYear()} ClearCause. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
