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

// Each rite's calendar begins in a different year -- 1970 for the Roman, 1976
// for the Ambrosian, whose reformed Missal begins there -- so a year that was
// in range under the previous rite need not be under the new one. The floors
// arrive from index.php on the form, keyed by rite, rather than being repeated
// here where they would drift from the enum that owns them.
//
// index.php clamps as well, and has to: form.submit() below runs no constraint
// check, and nothing obliges a browser to honour the min attribute in the first
// place. Clamping here too means the correction lands in the field the user is
// looking at, rather than arriving after the round trip.
const clampYearToRite = (form, rite) => {
    const yearInput = form.elements.namedItem('year');
    if (!yearInput) {
        return;
    }

    let minYearByRite;
    try {
        minYearByRite = JSON.parse(form.dataset.minYearByRite ?? '{}');
    } catch {
        // A malformed attribute is no reason to block the submit: index.php
        // clamps the posted year regardless.
        return;
    }

    const minYear = minYearByRite[rite];
    if (typeof minYear !== 'number') {
        return;
    }
    yearInput.min = minYear;

    const year = Number.parseInt(yearInput.value, 10);
    if (Number.isNaN(year)) {
        return;
    }
    const maxYear = Number.parseInt(yearInput.max, 10);
    const clamped = Number.isNaN(maxYear) ? Math.max(year, minYear) : Math.min(Math.max(year, minYear), maxYear);
    yearInput.value = clamped;
};

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
        clampYearToRite(form, event.target.value);
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
