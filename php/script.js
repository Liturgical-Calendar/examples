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
        const form = event.target.form;
        if (!form) {
            return;
        }
        // A calendar picked under the previous rite does not exist under the new
        // one: boston_us is Roman, and carrying it into an Ambrosian submit builds
        // /calendar/ambrosian/diocese/boston_us and earns a 400. Clear both so the
        // reload starts from the rite alone. The nation select is absent under a
        // rite with no national tier, hence the null check.
        ['national_calendar', 'diocesan_calendar'].forEach((name) => {
            const select = form.elements.namedItem(name);
            if (select) {
                select.value = '';
            }
        });
        form.submit();
    });
}

if ( document.readyState === 'loading' ) {
    document.addEventListener( 'DOMContentLoaded', initializeRiteAutoSubmit );
} else {
    initializeRiteAutoSubmit();
}
