const multiselectConfig = {
    buttonWidth: '100%',
    buttonClass: 'form-select',
    templates: { button: '<button type="button" class="multiselect dropdown-toggle" data-bs-toggle="dropdown"><span class="multiselect-selected-text"></span></button>' }
};

const initializeMultiselect = () => {
    $('#holydays_of_obligation').multiselect(multiselectConfig);
}

// Configure multiselect when DOM is ready
if ( document.readyState === 'loading' ) {
    document.addEventListener( 'DOMContentLoaded', initializeMultiselect );
} else {
    initializeMultiselect();
}
