import React from 'react'
import { FaDiscord, FaTwitter, FaYoutube, FaMedium } from 'react-icons/fa'

const Footer: React.FC = () => {
  const links = {
    company: [
      { href: '#', name: 'About Us' },
      { href: '#', name: 'Careers' },
      { href: '#', name: 'News & Media' },
      { href: '#', name: 'Contact Us' },
    ],
    solutions: [
      { href: '#', name: 'Bridge Design' },
      { href: '#', name: 'Structural Calculations' },
      { href: '#', name: 'Modular Systems' },
      { href: '#', name: 'Engineering Services' },
    ],
    resources: [
      { href: '#', name: 'Documentation' },
      { href: '#', name: 'Case Studies' },
      { href: '#', name: 'Technical Support' },
      { href: '#', name: 'Downloads' },
    ],
    legal: [
      { href: '#', name: 'Privacy Policy' },
      { href: '#', name: 'Terms of Service' },
      { href: '#', name: 'Cookie Policy' },
      { href: '#', name: 'Sitemap' },
    ],
  }

  const socialLinks = [
    { href: 'https://discord.gg/beaverbridges', icon: FaDiscord, label: 'Discord' },
    { href: 'https://x.com/beaverbridges', icon: FaTwitter, label: 'Twitter' },
    { href: 'https://youtube.com/@beaverbridges', icon: FaYoutube, label: 'YouTube' },
    { href: 'https://medium.com/@beaverbridges', icon: FaMedium, label: 'Medium' },
  ]

  const certifications = [
    { src: '/certs/iso9001.jpg', alt: 'ISO 9001' },
    { src: '/certs/iso14001.jpg', alt: 'ISO 14001' },
    { src: '/certs/iso45001.jpg', alt: 'ISO 45001' },
    { src: '/certs/chas.jpg', alt: 'CHAS' },
    { src: '/certs/constructionline.jpg', alt: 'Constructionline' },
    { src: '/certs/risqs.jpg', alt: 'RISQS' },
    { src: '/certs/avetta.jpg', alt: 'Avetta' },
    { src: '/certs/fors.jpg', alt: 'FORS' },
    { src: '/certs/sccs.jpg', alt: 'SCCS' },
    { src: '/certs/scba.jpg', alt: 'SCBA' },
    { src: '/certs/ceca.jpg', alt: 'CECA' },
    { src: '/certs/madeinbritain.jpg', alt: 'Made in Britain' },
  ]

  return (
    <footer className="w-screen bg-silver-300 px-3 py-12 text-black">
      <div className="container mx-auto max-w-screen-xl">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-8 border-b border-black/20">
          {/* Company Info */}
          <div className="col-span-1 lg:col-span-1">
            <img
              src="/logo.png"
              alt="Beaver Bridges Logo"
              className="mb-4 w-32"
            />
            <p className="text-sm leading-relaxed mb-4">
              Beaver Bridges Ltd<br />
              Structural Engineering Excellence<br />
              Innovative Modular Bridge Solutions
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black/70 hover:text-blue-100 transition-colors duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-6 h-6" />
                </a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-bold mb-4 text-black">Company</h3>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-black/70 hover:text-blue-100 transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions Links */}
          <div>
            <h3 className="font-bold mb-4 text-black">Solutions</h3>
            <ul className="space-y-2">
              {links.solutions.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-black/70 hover:text-blue-100 transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-bold mb-4 text-black">Resources</h3>
            <ul className="space-y-2">
              {links.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-black/70 hover:text-blue-100 transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold mb-4 text-black">Legal</h3>
            <ul className="space-y-2">
              {links.legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-black/70 hover:text-blue-100 transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Certifications Section */}
        <div className="py-8 border-b border-black/20">
          <h3 className="font-bold mb-6 text-center text-black">Accreditations & Certifications</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {certifications.map((cert) => (
              <div
                key={cert.alt}
                className="flex items-center justify-center bg-white/50 rounded-lg p-3 hover:bg-white/80 transition-all duration-300 hover:scale-105"
              >
                <img
                  src={cert.src}
                  alt={cert.alt}
                  className="max-w-full h-16 object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-black/70">
          <p className="mb-4 md:mb-0">
            © {new Date().getFullYear()} Beaver Bridges Ltd. All rights reserved. | Company Registration: 09733378
          </p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-blue-100 transition-colors duration-300">
              Privacy
            </a>
            <a href="#" className="hover:text-blue-100 transition-colors duration-300">
              Terms
            </a>
            <a href="#" className="hover:text-blue-100 transition-colors duration-300">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
