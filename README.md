# ClearCause - Transparent Charity Platform

ClearCause is a revolutionary charitable giving platform that ensures complete transparency through milestone-based funding, real-time impact tracking, and rigorous verification processes.

> **Note**: This is a capstone project demonstrating modern web development practices and transparent charity management.

## 🚀 Quick Start

### Prerequisites

Before getting started, make sure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Supabase account** - [Sign up here](https://supabase.com)

### Installation

```sh
# Step 1: Clone the repository
git clone https://github.com/YOUR_USERNAME/clearcause-capstone.git

# Step 2: Navigate to the project directory
cd clearcause-capstone

# Step 3: Install dependencies
npm install

# Step 4: Set up environment variables (see below)
cp env.example .env.local

# Step 5: Start the development server
npm run dev
```

## 🗄️ Database Setup (Supabase)

### Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new account or sign in
2. Click "New Project"
3. Choose your organization and create a new project
4. Wait for the project to be created (this can take a few minutes)

### Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy your **Project URL** and **anon/public** key
3. Copy your **Project Reference ID** (optional, for storage)

### Step 3: Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire content from `supabase-schema.sql` file in this repository
3. Paste it into the SQL Editor and click **Run**
4. Wait for the schema to be created (should see "ClearCause database schema setup completed successfully!")

### Step 4: Configure Authentication

1. In Supabase dashboard, go to **Authentication > Settings**
2. Configure your site URL: `http://localhost:5173` (for development)
3. Add any additional redirect URLs you'll need for production
4. Enable email confirmation (recommended)

### Step 5: Environment Configuration

Create a `.env.local` file in your project root and add your Supabase credentials:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Demo Mode (set to 'false' to use real Supabase backend)
VITE_DEMO_MODE=false

# Application Configuration (Optional)
VITE_APP_NAME=ClearCause
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development

# Feature Flags (Optional)
VITE_ENABLE_SOCIAL_LOGIN=true
VITE_ENABLE_EMAIL_VERIFICATION=true
VITE_ENABLE_REAL_TIME=true

# Development Settings (Optional)
VITE_DEBUG_MODE=true
```

## 📋 Required Supabase Dependencies

The following npm packages are required for Supabase integration:

```json
{
  "@supabase/supabase-js": "^2.57.2",
  "@tanstack/react-query": "^5.56.2"
}
```

These are already included in `package.json`, so running `npm install` will install them automatically.

## 🗄️ Database Schema Overview

The ClearCause platform uses the following main tables:

- **`profiles`** - Extended user information (linked to Supabase Auth)
- **`charities`** - Verified charity organizations
- **`campaigns`** - Fundraising campaigns with milestone tracking
- **`donations`** - Donation records with transparency tracking
- **`milestones`** - Campaign milestones for accountability
- **`milestone_proofs`** - Evidence submissions for milestone verification
- **`audit_logs`** - Complete audit trail for transparency

All tables include Row Level Security (RLS) policies for data protection.

## 🏃‍♂️ Running the Application

### Development Mode

```sh
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```sh
npm run build
```

### Preview Production Build

```sh
npm run preview
```

## 🛠️ Technologies Used

This project is built with:

- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **shadcn/ui** - Component library
- **Supabase** - Backend as a Service (Auth + Database)
- **React Router** - Client-side routing
- **React Hook Form** - Form management
- **React Query** - Server state management
- **Lucide React** - Icon library

## 🎯 Features

### For Donors
- ✅ Browse verified campaigns with real-time progress tracking
- ✅ Secure donation processing with instant receipts
- ✅ Track donation impact with photo evidence and metrics
- ✅ View complete transparency reports
- ✅ Anonymous donation options

### For Charities
- ✅ Create milestone-based campaigns
- ✅ Submit verification evidence for milestones
- ✅ Access donor communication tools
- ✅ View detailed analytics and reports
- ✅ Manage organization profiles

### For Administrators
- ✅ Charity verification workflows
- ✅ Milestone and proof verification
- ✅ Platform-wide analytics
- ✅ User management
- ✅ Audit log monitoring

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Authentication** - Supabase Auth with email verification
- **Role-based Access Control** - Admin, Charity, and Donor roles
- **Audit Logging** - Complete action tracking
- **Data Encryption** - Secure data transmission and storage

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components (Navbar, Footer)
│   └── admin/          # Admin-specific components
├── hooks/              # Custom React hooks
├── lib/                # Core utilities and configuration
├── pages/              # Application pages/routes
├── services/           # API service functions
├── utils/              # Helper utilities
└── middleware/         # Authentication middleware
```

## 🚀 Deployment

### Deploy to Vercel/Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting platform
3. Update your Supabase project settings with your production URL
4. Update your environment variables on your hosting platform

### Deploy with Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repository to [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on every push

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📧 Support

If you encounter any issues:

1. Check the console for error messages
2. Verify your environment variables are set correctly
3. Ensure your Supabase project is properly configured
4. Check that the database schema was applied successfully

## 🔗 Important Links

- **Supabase**: https://supabase.com
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **React**: https://react.dev
- **Vite**: https://vitejs.dev

## 📝 License

This project is part of a capstone project and is for educational purposes.

---

Built with ❤️ for transparent charitable giving.
