import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Instagram, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share2, ExternalLink } from 'lucide-react'

const UGC_POSTS = [
  {
    id: 1,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Rado_watches_designed_to_shine_through_celebrations_crafted_to_last_a_lifetime._%EF%B8%8F_..._Samay_ee04dr.mp4',
    link: 'https://www.instagram.com/reel/DYJbmPWBHur/',
    author: 'Samay Watches',
    handle: '@samaywatch',
    caption: 'Rado watches designed to shine through celebrations, crafted to last a lifetime. ✨ The perfect blend of timeless elegance and Swiss precision.',
    likes: '4.2K',
    comments: '128'
  },
  {
    id: 2,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/The_city_that_never_sleeps_inspires_the_watches_that_never_pause._newcampaign_balmainwatches_s_kxtnur.mp4',
    link: 'https://instagram.com',
    author: 'Samay Watches',
    handle: '@samaywatch',
    caption: 'The city that never sleeps inspires the watches that never pause. Unveiling the new Balmain collection – where modern chic meets heritage.',
    likes: '3.8K',
    comments: '95'
  },
  {
    id: 3,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/When_every_second_matters_choose_the_watch_that_defines_forever.Rado_Swiss_precision_for_your_e3oozh.mp4',
    link: 'https://instagram.com',
    author: 'Samay Watches',
    handle: '@samaywatch',
    caption: 'When every second matters, choose the watch that defines forever. Rado Swiss precision for your extraordinary moments.',
    likes: '5.1K',
    comments: '210'
  },
  {
    id: 4,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Elegance_that_endures._Precision_that_inspires.The_Balmain_watch_a_legacy_on_your_wrist..._watc_mcufyh.mp4',
    link: 'https://www.instagram.com/reel/DMIUdBuR_CT/',
    author: 'Samay Watches',
    handle: '@samaywatch',
    caption: 'Elegance that endures. Precision that inspires. The Balmain watch, a legacy on your wrist. Discover the latest arrivals.',
    likes: '2.9K',
    comments: '64'
  },
  {
    id: 5,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/A_mother_s_love_is_the_kind_of_time_that_never_fades.The_moments_she_gives_us_become_memories_we_fbmzzz.mp4',
    link: 'https://www.instagram.com/reel/DYJbmPWBHur/',
    author: 'Samay Watches',
    handle: '@samaywatch',
    caption: 'A mother\'s love is the kind of time that never fades. The moments she gives us become memories we cherish forever. Gift her the luxury of time.',
    likes: '6.5K',
    comments: '342'
  },
  {
    id: 6,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/When_given_as_a_wedding_gift_the_Longines_Master_Collection_watch_becomes_more_than_just_a_time_arjzrz.mp4',
    link: 'https://instagram.com',
    author: 'Samay Watches',
    handle: '@samaywatch',
    caption: 'When given as a wedding gift, the Longines Master Collection watch becomes more than just a timepiece – it becomes a family heirloom.',
    likes: '8.2K',
    comments: '415'
  }
];

function DetailedReelCard({ post, idx }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const togglePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted && isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <motion.div
      className="group flex flex-col overflow-hidden rounded-3xl bg-neutral-50 shadow-sm border border-neutral-100 hover:shadow-xl transition-all duration-500"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: idx * 0.1, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Video Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
        <a href={post.link} target="_blank" rel="noopener noreferrer" className="absolute inset-0 block w-full h-full cursor-pointer">
          <video
            ref={videoRef}
            src={post.videoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </a>

        {/* Video Controls Overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white transition-all hover:bg-black/60 hover:scale-105"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="size-4" strokeWidth={2} /> : <Volume2 className="size-4" strokeWidth={2} />}
          </button>
        </div>
        
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white transition-all hover:bg-black/60 hover:scale-105"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="size-4 fill-white" strokeWidth={1} /> : <Play className="ml-1 size-4 fill-white" strokeWidth={1} />}
          </button>
        </div>

        {/* Instagram Icon Overlay */}
        <div className="absolute bottom-4 right-4 z-10 opacity-0 transform translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
           <a href={post.link} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-black hover:text-white transition-colors">
              <Instagram className="size-5" />
           </a>
        </div>
      </div>

      {/* Content Details */}
      <div className="flex flex-col flex-grow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
                <div className="h-full w-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center">
                   <span className="font-serif font-bold text-lg text-black">S</span>
                </div>
             </div>
             <div>
                <h3 className="text-sm font-bold text-neutral-900">{post.author}</h3>
                <p className="text-xs text-neutral-500">{post.handle}</p>
             </div>
          </div>
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-black transition-colors">
             <ExternalLink className="size-5" />
          </a>
        </div>

        <p className="text-sm text-neutral-700 leading-relaxed mb-6 line-clamp-3 flex-grow">
          {post.caption}
        </p>

        <div className="flex items-center gap-6 mt-auto pt-4 border-t border-neutral-100">
           <div className="flex items-center gap-2 group/btn cursor-pointer">
              <Heart className="size-5 text-neutral-400 group-hover/btn:text-red-500 transition-colors" />
              <span className="text-xs font-semibold text-neutral-600 group-hover/btn:text-neutral-900">{post.likes}</span>
           </div>
           <div className="flex items-center gap-2 group/btn cursor-pointer">
              <MessageCircle className="size-5 text-neutral-400 group-hover/btn:text-black transition-colors" />
              <span className="text-xs font-semibold text-neutral-600 group-hover/btn:text-neutral-900">{post.comments}</span>
           </div>
           <div className="flex items-center gap-2 ml-auto cursor-pointer">
              <Share2 className="size-5 text-neutral-400 hover:text-black transition-colors" />
           </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function OurPresence() {
  return (
    <div className="min-h-screen bg-white pb-20 pt-24 sm:pt-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-16 md:mb-24 text-center max-w-3xl mx-auto">
           <div className="mb-6 flex items-center justify-center">
              <div className="flex items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px] shadow-lg">
                 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                    <Instagram strokeWidth={1.5} className="size-6 text-black" />
                 </div>
              </div>
           </div>
           <h1 className="text-4xl font-serif text-neutral-900 md:text-5xl lg:text-6xl mb-6">
              #SamayWatch
           </h1>
           <p className="text-lg text-neutral-500 mb-8 leading-relaxed">
              Explore the elegance of time. Join our community of watch enthusiasts and share your moments with us.
           </p>
           <a
            href="https://www.instagram.com/samaywatch/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-black px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:scale-105 hover:bg-neutral-900 shadow-xl shadow-black/20"
          >
            Follow @samaywatch
          </a>
        </div>

        {/* Detailed Reels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
           {UGC_POSTS.map((post, idx) => (
             <DetailedReelCard key={post.id} post={post} idx={idx} />
           ))}
        </div>
      </div>

      {/* Social Banner Footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-32">
         <div className="rounded-[2.5rem] bg-neutral-900 p-10 sm:p-16 text-center text-white overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/10 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
            
            <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
               <h2 className="font-serif text-4xl sm:text-5xl font-normal leading-tight text-white">
                  Where Every Moment
                  <span className="mt-2 block text-transparent bg-clip-text bg-gradient-to-r from-[#C29B57] to-[#E5C78B]">Deserves a Beautiful Watch</span>
               </h2>
               <p className="text-neutral-300 text-base sm:text-lg leading-relaxed">
                  Follow @samaywatch for new arrivals, styling inspiration, and exclusive behind-the-scenes moments from India&apos;s trusted watch destination.
               </p>
               <div className="pt-6">
                  <a 
                    href="https://instagram.com/samaywatch" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-4 bg-white text-black px-10 py-5 rounded-full text-sm font-black uppercase tracking-widest hover:bg-neutral-100 hover:scale-105 transition-all shadow-xl"
                  >
                     <span>Discover More</span>
                     <Instagram className="size-4" />
                  </a>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
