import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">ECommerce</h3>
            <p className="text-gray-400">Your trusted online shopping destination for quality products.</p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/about" className="hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-white">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white">
                  Returns
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/electronics" className="hover:text-white">
                  Electronics
                </Link>
              </li>
              <li>
                <Link href="/clothing" className="hover:text-white">
                  Clothing
                </Link>
              </li>
              <li>
                <Link href="/home" className="hover:text-white">
                  Home & Garden
                </Link>
              </li>
              <li>
                <Link href="/sports" className="hover:text-white">
                  Sports
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Newsletter</h4>
            <p className="text-gray-400 mb-4">Subscribe for updates and special offers</p>
            <div className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-l-lg text-white border border-gray-400 focus:outline-none focus:border-gray-200"
              />
              <button className="bg-blue-600 px-4 py-2 rounded-r-lg hover:bg-blue-700">Subscribe</button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 ECommerce Store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
