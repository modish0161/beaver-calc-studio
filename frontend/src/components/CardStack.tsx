"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export type ProjectCard = {
  id: number;
  projectName: string;
  location: string;
  testimonial: string;
  clientName: string;
  clientRole: string;
  image: string;
  stats?: {
    span?: string;
    load?: string;
    completion?: string;
  };
};

export const CardStack = ({
  items,
  offset,
  scaleFactor,
}: {
  items: ProjectCard[];
  offset?: number;
  scaleFactor?: number;
}) => {
  const CARD_OFFSET = offset || 10;
  const SCALE_FACTOR = scaleFactor || 0.06;
  const [cards, setCards] = useState<ProjectCard[]>(items);

  useEffect(() => {
    const interval = setInterval(() => {
      setCards((prevCards: ProjectCard[]) => {
        const newArray = [...prevCards];
        newArray.unshift(newArray.pop()!);
        return newArray;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[500px] w-full max-w-2xl mx-auto">
      {cards.map((card, index) => {
        return (
          <motion.div
            key={card.id}
            className="absolute w-full h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            style={{
              transformOrigin: "top center",
              background: "linear-gradient(135deg, rgba(38, 44, 83, 0.95) 0%, rgba(26, 31, 58, 0.95) 100%)",
            }}
            animate={{
              top: index * -CARD_OFFSET,
              scale: 1 - index * SCALE_FACTOR,
              zIndex: cards.length - index,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
              <img
                src={card.image}
                alt={card.projectName}
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#262C53]/50 to-[#262C53]/90" />
            </div>

            {/* Content */}
            <div className="relative h-full flex flex-col justify-between p-8">
              {/* Header */}
              <div className="space-y-2">
                <div className="inline-block px-3 py-1 rounded-full bg-[#00D9FF]/20 border border-[#00D9FF]/30">
                  <span className="text-xs font-semibold text-[#00D9FF] uppercase tracking-wider">
                    Featured Project
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white uppercase font-zentry">
                  {card.projectName}
                </h3>
                <p className="text-lg text-[#00D9FF] font-medium">
                  {card.location}
                </p>
              </div>

              {/* Project Stats */}
              {card.stats && (
                <div className="flex gap-6 py-4">
                  {card.stats.span && (
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-white">{card.stats.span}</span>
                      <span className="text-sm text-gray-400 uppercase tracking-wide">Span</span>
                    </div>
                  )}
                  {card.stats.load && (
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-white">{card.stats.load}</span>
                      <span className="text-sm text-gray-400 uppercase tracking-wide">Load Capacity</span>
                    </div>
                  )}
                  {card.stats.completion && (
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-white">{card.stats.completion}</span>
                      <span className="text-sm text-gray-400 uppercase tracking-wide">Completed</span>
                    </div>
                  )}
                </div>
              )}

              {/* Testimonial */}
              <div className="space-y-4">
                <div className="relative">
                  <svg
                    className="absolute -top-2 -left-2 w-8 h-8 text-[#00D9FF]/30"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-base text-gray-300 italic pl-6 leading-relaxed">
                    "{card.testimonial}"
                  </p>
                </div>
                <div className="pl-6 border-l-2 border-[#00D9FF]/50">
                  <p className="text-white font-semibold">{card.clientName}</p>
                  <p className="text-sm text-gray-400">{card.clientRole}</p>
                </div>
              </div>

              {/* Beaver Bridges Watermark */}
              <div className="absolute bottom-4 right-4 opacity-10">
                <span className="text-6xl font-black text-white uppercase font-zentry">BB</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
