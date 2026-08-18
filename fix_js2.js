const fs = require('fs');
let js = fs.readFileSync('frontend/public/js/main.js', 'utf8');

js = js.replace(/function prevSlide\(\) \{ changeSlide\(currentSlide - 1\); \}\r?\nfunction nextSlide\(\) \{ changeSlide\(currentSlide \+ 1\); \}/g, '');

const newLogic = let carouselInterval;
let currentSlideIdx = 0;

function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    currentSlideIdx = 0;
    startCarousel();
}

function startCarousel() {
    clearInterval(carouselInterval);
    carouselInterval = setInterval(() => {
        changeSlide(currentSlideIdx + 1);
    }, 5000);
}

window.changeSlide = function(newIdx) {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    slides[currentSlideIdx].classList.remove('active');
    
    currentSlideIdx = newIdx;
    if (currentSlideIdx >= slides.length) currentSlideIdx = 0;
    if (currentSlideIdx < 0) currentSlideIdx = slides.length - 1;
    
    slides[currentSlideIdx].classList.add('active');
    
    startCarousel();
};

window.prevSlide = function() { window.changeSlide(currentSlideIdx - 1); };
window.nextSlide = function() { window.changeSlide(currentSlideIdx + 1); };

// --- ABOUT SECTION LOGIC ---;

js = js.replace(/\/\/ --- Carousel Logic ---[\s\S]*?\/\/ --- ABOUT SECTION LOGIC ---/, newLogic);

fs.writeFileSync('frontend/public/js/main.js', js, 'utf8');
