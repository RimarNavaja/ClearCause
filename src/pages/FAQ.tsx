import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = React.useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqs = [
    {
      question: "How does ClearCause ensure transparency?",
      answer: "ClearCause uses milestone-based funding where donations are held in escrow and only released when specific, verifiable milestones are completed. Every milestone requires photo evidence and documentation that our verification team reviews before releasing funds."
    },
    {
      question: "What fees does ClearCause charge?",
      answer: "We charge a platform fee of 1-3% of donations, which is significantly lower than industry standards. This fee covers payment processing, verification services, and platform maintenance. There are no hidden fees or charges to donors."
    },
    {
      question: "How are charities verified?",
      answer: "Our verification process includes checking legal registration status, reviewing financial statements, assessing impact measurement capabilities, and evaluating operational history. Only about 30% of applicants pass our rigorous screening process."
    },
    {
      question: "Can I track where my donation goes?",
      answer: "Yes! You'll receive real-time updates on your donation's impact, including photos from the field, progress metrics, and milestone completion notifications. You can see exactly how your money is being used at every step."
    },
    {
      question: "What happens if a campaign doesn't reach its goal?",
      answer: "If a campaign doesn't reach its funding goal, donors can choose to either get a full refund or allow their donation to support the partial implementation of the project based on available funds."
    },
    {
      question: "How do I know if a charity is legitimate?",
      answer: "All charities on ClearCause display a verification badge after passing our screening process. You can also view their financial transparency score, past campaign success rates, and detailed impact reports."
    },
    {
      question: "Can I donate anonymously?",
      answer: "Yes, you can choose to make anonymous donations. Your name won't be displayed publicly, but you'll still receive all impact updates and tracking information in your private donor dashboard."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, bank transfers, and digital wallets. All payments are processed securely through encrypted, PCI-compliant systems."
    },
    {
      question: "How often do I receive updates on my donations?",
      answer: "You'll receive updates whenever a milestone is completed, typically every 2-4 weeks depending on the campaign. You can also check your donor dashboard anytime for real-time progress tracking."
    },
    {
      question: "Can I get a tax receipt for my donation?",
      answer: "Yes, you'll automatically receive a tax-deductible donation receipt via email immediately after making a donation. These receipts are accepted by tax authorities in most countries."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-clearcause-muted via-white to-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Find answers to common questions about ClearCause, transparent giving, 
                and how our platform works.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 pr-4">
                      {faq.question}
                    </h3>
                    {openItems.includes(index) ? (
                      <ChevronUp className="h-5 w-5 text-clearcause-primary flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-clearcause-primary flex-shrink-0" />
                    )}
                  </button>
                  {openItems.includes(index) && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Still have questions? */}
            <div className="mt-16 text-center bg-clearcause-muted rounded-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Still have questions?
              </h2>
              <p className="text-gray-600 mb-6">
                Can't find the answer you're looking for? Our support team is here to help.
              </p>
              <a 
                href="/contact" 
                className="inline-block bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
