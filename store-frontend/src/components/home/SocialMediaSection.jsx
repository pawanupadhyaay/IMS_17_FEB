import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Instagram, Play, Pause, Volume2, VolumeX } from 'lucide-react'

// Placeholder UGC Data
// Using premium placeholder images representing watch lifestyle
const UGC_POSTS = [
  {
    id: 1,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Rado_watches_designed_to_shine_through_celebrations_crafted_to_last_a_lifetime._%EF%B8%8F_..._Samay_ee04dr.mp4',
    link: 'https://www.instagram.com/reel/DYJbmPWBHur/'
  },
  {
    id: 2,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/The_city_that_never_sleeps_inspires_the_watches_that_never_pause._newcampaign_balmainwatches_s_kxtnur.mp4',
    link: 'https://instagram.com'
  },
  {
    id: 3,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/When_every_second_matters_choose_the_watch_that_defines_forever.Rado_Swiss_precision_for_your_e3oozh.mp4',
    link: 'https://instagram.com'
  },
  {
    id: 4,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Elegance_that_endures._Precision_that_inspires.The_Balmain_watch_a_legacy_on_your_wrist..._watc_mcufyh.mp4',
    link: 'https://www.instagram.com/reel/DMIUdBuR_CT/'
  },
  {
    id: 5,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/A_mother_s_love_is_the_kind_of_time_that_never_fades.The_moments_she_gives_us_become_memories_we_fbmzzz.mp4',
    link: 'https://www.instagram.com/reel/DYJbmPWBHur/'
  },
  {
    id: 6,
    type: 'video',
    videoUrl: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/When_given_as_a_wedding_gift_the_Longines_Master_Collection_watch_becomes_more_than_just_a_time_arjzrz.mp4',
    link: 'https://instagram.com'
  }
]

function ReelCard({ post, idx }) {
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
        videoRef.current.play().catch(() => { });
      }
    }
  };

  return (
    <motion.div
      className="group relative flex aspect-[9/16] w-[65vw] shrink-0 snap-center overflow-hidden rounded-[14px] bg-neutral-100 sm:w-auto shadow-sm"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: idx * 0.1, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <a href={post.link} target="_blank" rel="noopener noreferrer" className="absolute inset-0 block w-full h-full bg-neutral-900">
        {post.videoUrl ? (
          <video
            ref={videoRef}
            src={post.videoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <img
            src={post.thumbnail}
            alt={`Instagram Reel ${idx + 1}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}

        {post.videoUrl ? (
          <>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              className="absolute top-3 left-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 hover:scale-110"
            >
              {isMuted ? (
                <VolumeX className="size-3.5 text-black" strokeWidth={2} />
              ) : (
                <Volume2 className="size-3.5 text-black" strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              className="absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 hover:scale-110"
            >
              {isPlaying ? (
                <Pause className="size-3.5 fill-black text-black" strokeWidth={1} />
              ) : (
                <Play className="ml-0.5 size-3.5 fill-black text-black" strokeWidth={1} />
              )}
            </button>
          </>
        ) : (
          <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-0.5 size-3.5 fill-black text-black" strokeWidth={1} />
          </div>
        )}
      </a>
    </motion.div>
  );
}

export default function SocialMediaSection() {
  return (
    <section className="bg-[#f4f3ef] py-16 sm:py-20 md:py-24" aria-labelledby="social-media-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 md:mb-14 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center rounded-full bg-black text-white p-3 shadow-md">
            <Instagram strokeWidth={1.5} className="size-6" />
          </div>
          <h2
            id="social-media-heading"
            className="font-poppins text-[1.65rem] font-black leading-tight tracking-tight text-black sm:text-3xl md:text-4xl uppercase"
          >
            #SamayWatch
          </h2>
          <p className="mt-3 max-w-[24rem] text-[13px] leading-relaxed text-neutral-500 sm:text-base">
            Where precision meets timeless luxury.
          </p>
          <a
            href="https://www.instagram.com/samaywatch/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center border border-black px-8 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-black hover:text-white"
          >
            Follow Us
          </a>
        </div>

        {/* Mobile Horizontal Snap Grid / Desktop Grid */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 md:grid-cols-6 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
          {UGC_POSTS.map((post, idx) => (
            <ReelCard key={post.id} post={post} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  )
}
