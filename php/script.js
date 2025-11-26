document.addEventListener("DOMContentLoaded", function(event) {
    // Configure multiselect based on Bootstrap version
    const multiselectConfig = {
        buttonWidth: '100%',
        buttonClass: 'form-select',
        templates: { button: '<button type="button" class="multiselect dropdown-toggle" data-bs-toggle="dropdown"><span class="multiselect-selected-text"></span></button>' }
    };
    $('#holydays_of_obligation').multiselect(multiselectConfig);
});
