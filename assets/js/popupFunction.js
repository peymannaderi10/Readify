var slider = document.getElementById('slider');

noUiSlider.create(slider, {
    start: [50],  // Two handles, starting at values 20 and 80
    snap: true,
    range: {
        'min': 0,
        '25%': 25,
        '50%': 50,
        '75%': 75,
        'max': 100
    }
});

// Create an element to display the value
var valueElement = document.createElement('div');
sliderElement.appendChild(valueElement);

// Update the element with the slider value whenever it changes
sliderElement.noUiSlider.on('update', function (values, handle) {
    valueElement.innerHTML = values[handle];
});
