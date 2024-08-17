const image = document.getElementById('image');

function toggleImgSize(event){
	const image=event.target;
	image.classList.toggle('enlarged');
}

const images = document.querySelectorAll('.image');

images.forEach(img => {
	img.addEventListener('click', toggleImgSize);
});

