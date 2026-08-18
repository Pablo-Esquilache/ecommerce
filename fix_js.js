const fs = require('fs');
let js = fs.readFileSync('frontend/public/js/main.js', 'utf8');

// Replace old carousel logic
const oldLogic = // --- Carousel Logic ---
function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    let currentSlide = 0;
    
    // Cambiar de imagen cada 5 segundos
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
};

const newLogic = // --- Carousel Logic ---
let carouselInterval;
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

function changeSlide(newIdx) {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    slides[currentSlideIdx].classList.remove('active');
    
    currentSlideIdx = newIdx;
    if (currentSlideIdx >= slides.length) currentSlideIdx = 0;
    if (currentSlideIdx < 0) currentSlideIdx = slides.length - 1;
    
    slides[currentSlideIdx].classList.add('active');
    
    startCarousel(); // Restart timer when manually changed
}

window.prevSlide = function() { changeSlide(currentSlideIdx - 1); };
window.nextSlide = function() { changeSlide(currentSlideIdx + 1); };;

js = js.replace(oldLogic, newLogic);

// Remove the old prevSlide/nextSlide at the very bottom
js = js.replace(/function prevSlide\(\) \{ changeSlide\(currentSlide - 1\); \}\nfunction nextSlide\(\) \{ changeSlide\(currentSlide \+ 1\); \}/, '');

fs.writeFileSync('frontend/public/js/main.js', js, 'utf8');
