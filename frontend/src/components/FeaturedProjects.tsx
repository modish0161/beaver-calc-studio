import { motion } from 'framer-motion'
import { CardStack, ProjectCard } from './CardStack'

const featuredProjects: ProjectCard[] = [
  {
    id: 1,
    projectName: "Modular Steel Bridge",
    location: "M6 Motorway, Birmingham",
    testimonial: "Beaver Bridges delivered exceptional engineering solutions. Their calculations were precise, and the modular design reduced our installation time by 40%. Outstanding professionalism throughout.",
    clientName: "David Richardson",
    clientRole: "Project Director, Highways England",
    image: "/assets/images/projects/bridge-1.png",
    stats: { span: "45m", load: "40T", completion: "2024" }
  },
  {
    id: 2,
    projectName: "Bailey Bridge System",
    location: "River Trent Crossing, Nottingham",
    testimonial: "The BeaverCalc Studio platform gave us confidence in every calculation. Real-time EN1993 verification meant we could move quickly without compromising on safety or quality.",
    clientName: "Sarah Mitchell",
    clientRole: "Chief Engineer, Balfour Beatty",
    image: "/assets/images/projects/bridge-2.png",
    stats: { span: "60m", load: "65T", completion: "2024" }
  },
  {
    id: 3,
    projectName: "Temporary Access Bridge",
    location: "HS2 Construction Site, Leeds",
    testimonial: "Beaver Bridges transformed our temporary works process. What used to take days of manual calculations now happens in minutes with full traceability and audit trails.",
    clientName: "James Patterson",
    clientRole: "Site Manager, Costain",
    image: "/assets/images/projects/bridge-3.png",
    stats: { span: "32m", load: "50T", completion: "2025" }
  },
  {
    id: 4,
    projectName: "Multi-Span Trackway",
    location: "Construction Logistics Hub, Manchester",
    testimonial: "The precision and speed of their engineering calculations is remarkable. We completed our temporary works design in record time while maintaining the highest safety standards.",
    clientName: "Emma Thompson",
    clientRole: "Technical Lead, Mace Group",
    image: "/assets/images/projects/bridge-4.png",
    stats: { span: "120m", load: "100T", completion: "2024" }
  },
  {
    id: 5,
    projectName: "Pedestrian Footbridge",
    location: "Thames River Crossing, London",
    testimonial: "Working with Beaver Bridges was a game-changer. Their expertise in EN standards and attention to detail gave us complete confidence in the structural integrity of our design.",
    clientName: "Michael Chen",
    clientRole: "Senior Engineer, Arup",
    image: "/assets/images/projects/bridge-5.png",
    stats: { span: "85m", load: "5kN/m²", completion: "2025" }
  },
  {
    id: 6,
    projectName: "Heavy Lift Platform",
    location: "Port Expansion, Bristol",
    testimonial: "Beaver Bridges' calculator suite is the most comprehensive we've used. From initial feasibility to final design, every step was supported with robust, verifiable calculations.",
    clientName: "Robert Williams",
    clientRole: "Project Engineer, Kier Group",
    image: "/assets/images/projects/bridge-6.png",
    stats: { span: "28m", load: "150T", completion: "2024" }
  }
]

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export const FeaturedProjects = () => {
  return (
    <section className="relative py-32 overflow-hidden bg-[#0c0e1a]">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #00D9FF 0.5px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="container mx-auto px-6 relative z-10 max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            variants={fadeInUp}
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00D9FF]/20 bg-[#00D9FF]/[0.05] mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
            <span className="text-xs font-semibold text-[#00D9FF] uppercase tracking-[0.2em]">
              Featured Projects
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            custom={0.1}
            className="text-5xl md:text-7xl font-black text-white uppercase mb-6 font-zentry leading-[0.95]"
          >
            Trusted By{' '}
            <span className="text-[#00D9FF]">Industry Leaders</span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            custom={0.2}
            className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            From major infrastructure to temporary works, Beaver Bridges delivers precision
            engineering calculations that power critical projects across the UK.
          </motion.p>
        </motion.div>

        {/* Card Stack */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <CardStack items={featuredProjects} offset={12} scaleFactor={0.05} />
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-28 grid grid-cols-2 md:grid-cols-4 gap-5"
        >
          {[
            { value: '500+', label: 'Projects Delivered' },
            { value: '98%', label: 'Client Satisfaction' },
            { value: '50+', label: 'Major Contractors' },
            { value: '10K+', label: 'Calculations Run' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="text-center py-8 px-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-[#00D9FF]/20 transition-colors duration-300"
            >
              <div className="text-4xl md:text-5xl font-black text-[#00D9FF] mb-2 font-zentry tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 font-semibold uppercase tracking-[0.15em]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Certifications */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-4"
        >
          <span className="text-xs text-gray-600 uppercase tracking-[0.2em] font-semibold mr-2">
            Accredited:
          </span>
          {['ISO 9001', 'ISO 14001', 'ISO 45001', 'CHAS', 'RISQS'].map((cert) => (
            <span
              key={cert}
              className="px-4 py-2 text-xs font-semibold text-gray-400 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-[#00D9FF]/20 transition-colors duration-300"
            >
              {cert}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default FeaturedProjects
