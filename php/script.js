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

// Switching rite rebuilds the diocese list server-side, so the form is
// submitted as soon as the rite changes rather than making the user pick a
// rite, submit, and only then find the dioceses they wanted. Optional
// chaining because index.php can be included in another page, where the
// element may be absent.
const initializeRiteAutoSubmit = () => {
    document.getElementById('rite')?.addEventListener('change', (event) => {
        event.target.form?.submit();
    });
}

if ( document.readyState === 'loading' ) {
    document.addEventListener( 'DOMContentLoaded', initializeRiteAutoSubmit );
} else {
    initializeRiteAutoSubmit();
}
