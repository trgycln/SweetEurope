'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface FloatingAsset {
    id: string;
    src: string;
    alt: string;
    width: number;
    height: number;
    initialX: number; // Yüzde olarak (merkezden uzaklık X)
    initialY: number; // Yüzde olarak (merkezden uzaklık Y)
    parallaxFactor: number; // Hız ve genişlik çarpanı (Derinlik)
    zIndex: number; // Şişenin önünde mi arkasında mı? (Şişe = 10)
    rotation: number; // Başlangıç dönüş açısı
    blur?: number; // Arka plan bulanıklığı
}

const assets: FloatingAsset[] = [
    // Arka Plandakiler (Uzak, yavaş ve bulanık)
    { id: 'coffee-bean-1', src: '/images/philosophy/coffee-bean.png', alt: 'Coffee Bean', width: 60, height: 60, initialX: -30, initialY: -25, parallaxFactor: 0.02, zIndex: 1, rotation: 15, blur: 4 },
    { id: 'caramel-1', src: '/images/philosophy/caramel-cube.png', alt: 'Caramel Cube', width: 70, height: 70, initialX: 35, initialY: -35, parallaxFactor: 0.015, zIndex: 2, rotation: -20, blur: 3 },
    { id: 'vanilla-1', src: '/images/philosophy/vanilla-bean.png', alt: 'Vanilla Bean', width: 120, height: 80, initialX: -40, initialY: 30, parallaxFactor: 0.025, zIndex: 3, rotation: 45, blur: 2 },
    
    // Orta Plan (Normal hız, net)
    { id: 'coffee-bean-2', src: '/images/philosophy/coffee-bean.png', alt: 'Coffee Bean', width: 80, height: 80, initialX: 45, initialY: 15, parallaxFactor: 0.04, zIndex: 5, rotation: -40 },
    { id: 'mint-1', src: '/images/philosophy/mint-leaf.png', alt: 'Mint Leaf', width: 70, height: 70, initialX: -20, initialY: 45, parallaxFactor: 0.05, zIndex: 6, rotation: 10 },
    
    // Ön Plan (Hızlı, büyük ve çok net)
    { id: 'caramel-2', src: '/images/philosophy/caramel-cube.png', alt: 'Caramel Cube', width: 100, height: 100, initialX: -45, initialY: -10, parallaxFactor: 0.08, zIndex: 20, rotation: 35 },
    { id: 'coffee-bean-3', src: '/images/philosophy/coffee-bean.png', alt: 'Coffee Bean', width: 110, height: 110, initialX: 30, initialY: 40, parallaxFactor: 0.09, zIndex: 21, rotation: -15 },
    { id: 'vanilla-2', src: '/images/philosophy/vanilla-bean.png', alt: 'Vanilla Bean', width: 150, height: 100, initialX: 20, initialY: -45, parallaxFactor: 0.07, zIndex: 22, rotation: 80 },
];

export default function ZeroGravityAroma() {
    const containerRef = useRef<HTMLDivElement>(null);
    const bottleRef = useRef<HTMLDivElement>(null);
    const assetRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.matchMedia("(max-width: 768px)").matches);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useGSAP(() => {
        // 1. Açılış (Entrance) Patlama Animasyonu
        // Tüm elementler merkezden (0,0) başlayıp kendi initial koordinatlarına gider
        const tl = gsap.timeline();
        
        // Şişe yavaşça belirir ve hafifçe yukarı çıkar
        tl.from(bottleRef.current, {
            y: 100,
            opacity: 0,
            duration: 1.5,
            ease: "power3.out"
        }, 0);

        // Aromalar merkezden dışarı patlar
        assetRefs.current.forEach((el, index) => {
            if (!el) return;
            const asset = assets[index];
            
            tl.fromTo(el, {
                xPercent: 0,
                yPercent: 0,
                scale: 0.2,
                opacity: 0,
                rotation: 0
            }, {
                xPercent: asset.initialX,
                yPercent: asset.initialY,
                scale: 1,
                opacity: 1,
                rotation: asset.rotation,
                duration: 2,
                ease: "power3.out",
                delay: index * 0.05
            }, 0.2); // Şişeden biraz sonra başlasın
        });

        // 2. Idle Levitation (Doğal Salınım)
        assetRefs.current.forEach((el, index) => {
            if (!el) return;
            
            // Rastgele bir salınım süresi ve mesafesi
            const duration = 2.5 + Math.random() * 2;
            const yOffset = 10 + Math.random() * 15;
            const rotationOffset = 5 + Math.random() * 10;
            
            gsap.to(el, {
                y: `+=${yOffset}`,
                rotation: `+=${rotationOffset}`,
                duration: duration,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: Math.random() * 2 // Rastgele başlama zamanları
            });
        });

        // Mobil cihazsa Mouse Parallax iptal
        if (isMobile) return;

        // 3. Mouse Move Parallax
        const handleMouseMove = (e: MouseEvent) => {
            const { innerWidth, innerHeight } = window;
            const x = (e.clientX / innerWidth - 0.5) * 2; // -1 ile 1 arası
            const y = (e.clientY / innerHeight - 0.5) * 2; // -1 ile 1 arası

            assetRefs.current.forEach((el, index) => {
                if (!el) return;
                const asset = assets[index];
                
                gsap.to(el, {
                    x: -x * (innerWidth * asset.parallaxFactor),
                    y: -y * (innerHeight * asset.parallaxFactor),
                    rotation: asset.rotation + (-x * 20 * asset.parallaxFactor),
                    duration: 1,
                    ease: "power2.out",
                    overwrite: "auto" // Çakışmaları engelle
                });
            });

            // Şişenin kendisine de çok hafif bir paralaks verelim (Aromalardan zıt yönde veya çok yavaş)
            gsap.to(bottleRef.current, {
                x: x * 20,
                y: y * 20,
                rotationY: x * 5,
                rotationX: -y * 5,
                duration: 1.5,
                ease: "power2.out",
                overwrite: "auto"
            });
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, { dependencies: [isMobile], scope: containerRef });

    return (
        <div 
            ref={containerRef} 
            className="relative w-full h-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px] overflow-hidden bg-slate-900 flex items-center justify-center rounded-2xl"
        >
            {/* Arka Plan Radyal Degrade */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,rgba(15,23,42,1)_70%)] pointer-events-none"></div>

            {/* Arka Plan Işık Hüzmesi */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-blue-500/20 blur-[80px] md:blur-[100px] rounded-full pointer-events-none"></div>

            {/* Aromalar (Floating Assets) */}
            {assets.map((asset, idx) => (
                <div 
                    key={asset.id}
                    ref={(el) => { assetRefs.current[idx] = el; }}
                    className="absolute top-1/2 left-1/2 pointer-events-none"
                    style={{ 
                        zIndex: asset.zIndex,
                        filter: asset.blur ? `blur(${asset.blur}px)` : 'none'
                    }}
                >
                    {/* Resim Container'ı ortalama için */}
                    <div className="relative -ml-[50%] -mt-[50%]">
                        <Image 
                            src={asset.src} 
                            alt={asset.alt}
                            width={asset.width}
                            height={asset.height}
                            className="object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] w-10 md:w-auto h-10 md:h-auto"
                            style={{ 
                                width: isMobile ? asset.width * 0.6 : asset.width,
                                height: isMobile ? asset.height * 0.6 : asset.height
                            }}
                        /> 
                    </div>
                </div>
            ))}

            {/* Ana Odak: Kahve Şurubu Şişesi */}
            <div 
                ref={bottleRef} 
                className="relative z-10 pointer-events-none perspective-1000"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Şişe Gölgesi */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 md:w-48 h-8 md:h-12 bg-black/40 blur-xl rounded-full"></div>
                
                {/* Şişe Görseli */}
                <div className="relative flex items-end justify-center z-10 drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]">
                    <Image 
                        src="/images/philosophy/main-bottle.png"
                        alt="Premium FO Syrup"
                        width={250}
                        height={550}
                        className="object-contain max-h-[250px] md:max-h-[450px] w-auto"
                        priority
                    />
                </div>
            </div>

        </div>
    );
}
