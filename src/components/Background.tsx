import React from 'react';
import { motion } from 'motion/react';
import { Cloud, Star, Sun } from 'lucide-react';

export const Background: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#E3F2FD] to-white opacity-80" />

      {/* Floating Clouds */}
      <motion.div
        animate={{ x: [-20, 20, -20] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] left-[10%] opacity-40"
      >
        <Cloud className="w-24 h-24 text-white fill-white" />
      </motion.div>

      <motion.div
        animate={{ x: [20, -20, 20] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] right-[15%] opacity-30"
      >
        <Cloud className="w-32 h-32 text-white fill-white" />
      </motion.div>

      <motion.div
        animate={{ x: [-10, 10, -10] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[5%] left-[40%] opacity-20"
      >
        <Cloud className="w-20 h-20 text-white fill-white" />
      </motion.div>

      {/* Twinkling Stars */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.2, scale: 0.8 }}
          animate={{ 
            opacity: [0.2, 0.6, 0.2],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{ 
            duration: 2 + Math.random() * 3, 
            repeat: Infinity, 
            delay: Math.random() * 5 
          }}
          className="absolute text-[#FFD93D]"
          style={{
            top: `${5 + Math.random() * 30}%`,
            left: `${5 + Math.random() * 90}%`,
          }}
        >
          <Star className="w-4 h-4 fill-[#FFD93D]" />
        </motion.div>
      ))}

      {/* Soft Sun */}
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-8 right-8 opacity-40"
      >
        <div className="relative">
          <Sun className="w-20 h-20 text-[#FFD93D] fill-[#FFD93D]" />
          <div className="absolute inset-0 bg-[#FFD93D] blur-2xl rounded-full opacity-30" />
        </div>
      </motion.div>

      {/* Grass Field & Trees (Bottom) */}
      <div className="absolute bottom-0 w-full h-[20%] opacity-60">
        {/* Grass Curve */}
        <svg viewBox="0 0 1440 320" className="absolute bottom-0 w-full h-full preserve-3d">
          <path 
            fill="#C8E6C9" 
            fillOpacity="1" 
            d="M0,224L80,213.3C160,203,320,181,480,181.3C640,181,800,203,960,208C1120,213,1280,203,1360,197.3L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
          ></path>
        </svg>

        {/* Simple Trees */}
        <div className="absolute bottom-4 left-[10%] flex flex-col items-center">
          <div className="w-12 h-12 bg-[#81C784] rounded-full" />
          <div className="w-2 h-4 bg-[#8D6E63]" />
        </div>

        <div className="absolute bottom-6 right-[20%] flex flex-col items-center">
          <div className="w-16 h-16 bg-[#A5D6A7] rounded-full" />
          <div className="w-3 h-6 bg-[#8D6E63]" />
        </div>

        <div className="absolute bottom-2 left-[35%] flex flex-col items-center">
          <div className="w-10 h-10 bg-[#C8E6C9] rounded-full" />
          <div className="w-2 h-3 bg-[#8D6E63]" />
        </div>
      </div>
    </div>
  );
};
