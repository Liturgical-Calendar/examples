import { ApiClient, ApiOptionsFilter, CalendarViewer, Input, ThemePreset, Grouping, ColorAs, Column, ColumnOrder, DateFormat, GradeDisplay } from '@liturgical-calendar/components-js';

/**
 * Detect Bootstrap version (4 or 5) based on available features
 * @returns {number} Bootstrap major version (4 or 5)
 */
function getBootstrapVersion() {
    // Bootstrap 5 has bootstrap.Dropdown with 'getOrCreateInstance' method
    if (typeof bootstrap !== 'undefined' && bootstrap.Dropdown && typeof bootstrap.Dropdown.getOrCreateInstance === 'function') {
        return 5;
    }
    // Bootstrap 4 uses jQuery-based API
    if (typeof $.fn.dropdown !== 'undefined') {
        return 4;
    }
    // Default to 5 if we can't detect
    return 5;
}

const bsVersion = getBootstrapVersion();
const isBS5 = bsVersion === 5;

// Which framework the page loaded is a page fact the library cannot see, so the probe
// above stays with the consumer -- but since 2.8.0 it chooses a PRESET NAME rather than
// a class table. That `<select>` is `form-select` in Bootstrap 5 and `form-control` in
// Bootstrap 4 is what the framework calls those things, not this example's decision, and
// it was the same mapping every consuming page was rewriting.
const themePreset = isBS5 ? ThemePreset.BOOTSTRAP_5 : ThemePreset.BOOTSTRAP_4;

/**
 * Builds the grid column class for a form control's wrapper.
 *
 * Bootstrap 5 needs the bare `col` alongside `col-md-*` for the columns to share
 * the row evenly below the md breakpoint; Bootstrap 4 does not.
 *
 * Each of the two rows the form is split across is budgeted to twelve columns, so
 * neither wraps: 2 + 4 + 2 + 2 + 2 for the rite, calendar, locale, year type and
 * year, and 3 + 2 + 2 + 2 + 3 for the five General Roman parameters.
 *
 * @param {number} span - The number of columns to span at the md breakpoint.
 * @returns {string} The wrapper class.
 */
function formGroupClass(span) {
    return isBS5 ? `form-group col col-md-${span}` : `form-group col-md-${span}`;
}

// A preset covers CONTROLS and never LAYOUT -- no wrapper, no grid span, no spacing
// utility -- so the two wrapper globals stay here. The input and label class globals
// are gone: naming a preset opens the `theme.apiOptions` gate, so the theme bag below
// reaches all ten ApiOptions inputs and supplies both.
Input.setGlobalWrapper('div');
// The narrowest of the two widths any ApiOptions input takes; the wider ones
// override it individually below.
Input.setGlobalWrapperClass(formGroupClass(2));

/**
 * Reports a failure the reader needs to see, rather than only the console.
 *
 * Without this the page just stays empty: the table renders nothing and the only
 * account of why is in devtools. Uses toastr where the host page provides it --
 * the frontend loads it for the examples page -- and falls back to a native
 * `<dialog>` for this example standalone, which does not. Deliberately not
 * `alert()`, which blocks the event loop behind an unstyleable browser modal.
 *
 * The same helper, for the same reason, as in fullcalendar/script.js: each example
 * here is self-contained and imported straight from a CDN with no build step, so
 * they share conventions rather than modules.
 *
 * @param {string} message - The message to show. Inserted as text, never as markup.
 * @returns {void}
 */
function reportFailure(message) {
    console.error(message);
    if (typeof toastr !== 'undefined') {
        toastr.error(message, null, { timeOut: 0, extendedTimeOut: 0, closeButton: true });
        return;
    }
    const dialog = document.createElement('dialog');
    dialog.className = 'litcal-failure';
    const text = document.createElement('p');
    text.textContent = message;
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'btn btn-secondary';
    dismiss.textContent = 'Close';
    dismiss.addEventListener('click', () => dialog.close());
    // Remove on `close` rather than in the click handler: a modal <dialog> also
    // closes on Escape, which fires this event but not that click.
    dialog.addEventListener('close', () => dialog.remove());
    dialog.append(text, dismiss);
    document.body.appendChild(dialog);
    dialog.showModal();
}

/**
 * Greys the holy days of obligation multiselect button when the current selection
 * predetermines that input, and hands it back to the user when it does not.
 *
 * Driven by `CalendarControls.selection.predeterminedInputs` rather than by the
 * calendar select's value. The two agree for THIS input -- holy days are not fixed by
 * any rite, so they follow the calendar half of the rule alone -- but the payload is
 * derived from the very rule ApiOptions uses to disable an input, so the greying and
 * the disabling cannot drift, and the same test now reads correctly for the four
 * inputs where `value === ''` does not: under the Ambrosian rite the Missal fixes
 * Epiphany, Ascension and Corpus Domini and does not establish the Eternal High
 * Priest, so those are predetermined with no calendar selected at all.
 *
 * @param {HTMLSelectElement} hdobInput - The holy days of obligation select element.
 * @param {boolean} readOnly - Whether the current selection predetermines the input.
 */
function setHolyDaysOfObligationBgColor(hdobInput, readOnly) {
    if (readOnly) {
        $(hdobInput).parent().find('button.multiselect').css('background-color', '#e9ecef');
    } else {
        $(hdobInput).multiselect('deselectAll', false).multiselect('selectAll', false).parent().find('button.multiselect').removeAttr('style');
    }
}

ApiClient.init(typeof BaseUrl !== 'undefined' ? BaseUrl : 'https://litcal.johnromanodorazio.com/api/dev').then( (apiClient) => {
    // CalendarViewer is the whole of this page bar the jQuery treatment below: a rite
    // select, a calendar select and ApiOptions, wired to each other and to the client,
    // plus the WebCalendar that renders what they fetch.
    //
    // The two wires the rite needs are the trap this class exists to close. ApiOptions
    // rebuilds the calendar list and disables the temporal options the rite fixes, but
    // only the client turns the rite into a path segment; wiring just the first leaves
    // the form reading `ambrosian` while every request still goes to /calendar/roman/.
    // listenTo() installs both.
    //
    // The constructor path rather than CalendarViewer.mountInto(), because
    // AcceptHeaderInput.hide() below sets a flag that ApiOptions.appendTo() reads when
    // it decides whether to render that input -- so it is only meaningful between
    // construction and the mount, a window mountInto() does not offer.
    const viewer = new CalendarViewer({
        // A full BCP-47 tag: standalone this page's <html> carries no lang and this
        // falls back, embedded in the frontend it is e.g. 'it-IT'. No tag-versus-subtag
        // care is needed here -- appendTo()'s locale cascade matches exactly, then by
        // language prefix, so 'it-IT' finds the API's 'it' on its own, preselects the
        // locale input to match and requests that locale on every fetch, first included.
        locale: document.documentElement.lang || 'en-US',
        apiClient,
        // Row one only. The General Roman parameters are appended separately below.
        filter: ApiOptionsFilter.ALL_CALENDARS,
        theme: {
            // Since 2.8.0 a preset supplies the `select` and `input` classes this page
            // used to spell out, and naming one opens the `theme.apiOptions` gate, so
            // they reach all ten ApiOptions inputs as well as the two selects. `label`
            // is still written out: a preset covers CONTROLS and never LAYOUT, and
            // `d-block mb-1` is layout. Writing it also keeps the Bootstrap 4 branch
            // rendering exactly as before, since `bootstrap4` emits no label class of
            // its own -- `.form-label` is a Bootstrap 5 class.
            preset: themePreset,
            label: 'form-label d-block mb-1',
            // Since 2.4.0 the wrapper role reaches the rite select too, so both selects
            // take their grid column from here rather than from a hand-built div.
            riteSelect: { wrapperClass: formGroupClass(2) },
            calendarSelect: { wrapperClass: formGroupClass(4) }
        },
        webCalendar: {
            id: 'LitCalTable',
            firstColumnGrouping: Grouping.BY_LITURGICAL_SEASON,
            psalterWeekColumn: true, // add psalter week column as the right hand most column
            removeHeaderRow: true, // we don't need to see the header row
            seasonColor: ColorAs.CSS_CLASS,
            seasonColorColumns: Column.LITURGICAL_SEASON,
            eventColor: ColorAs.INDICATOR,
            eventColorColumns: Column.EVENT_DETAILS,
            monthHeader: true, // enable month header at the start of each month
            dateFormat: DateFormat.DAY_ONLY,
            columnOrder: ColumnOrder.GRADE_FIRST,
            gradeDisplay: GradeDisplay.ABBREVIATED
        }
    });

    // The preset above styles all ten ApiOptions inputs, so what is left here is only
    // what a preset does not cover: the Accept header input's visibility, and the two
    // column widths that differ from the global col-md-2. The
    // `yearInput.class( 'form-control' )` that used to sit here went with them -- it
    // overrode the global input class to reach the very value the `input` role already
    // resolves to under either preset.
    //
    // These are the canonical accessors 2.8.0 added. The underscore spellings still
    // work and are not deprecated, but on ApiOptions that prefix now means
    // package-internal, and these ten are the ones a consumer is meant to reach for.
    const apiOptions = viewer.controls.apiOptions;
    apiOptions.acceptHeaderInput.hide(); // read at append time; see above
    // The two inputs with the longest option labels get the extra width; the rest
    // keep the global col-md-2.
    apiOptions.epiphanyInput.wrapperClass( formGroupClass(3) );
    apiOptions.holydaysOfObligationInput.wrapperClass( formGroupClass(3) );

    // Row one: the rite and calendar selects, then the inputs the ALL_CALENDARS filter
    // selects -- locale, year type and year, in that order, the Accept header input
    // having been hidden above. The messages slot renders the API's messages array;
    // since 2.8.0 it sanitizes that markup against an allowlist rather than writing it
    // as text, so the decree links and emphasis the API emits render as markup instead
    // of as literal tags.
    viewer.appendTo({
        controls: '#calendarOptions',
        calendar: '#litcalWebcalendar',
        messages: '#LitCalMessages tbody'
    });

    // Row two. ApiOptions is one object whose appendTo() moves whichever inputs its
    // CURRENT filter selects, so calling filter().appendTo() again distributes the rest
    // of the same instance into a second container -- no second ApiOptions, and no
    // duplicated inputs. ApiExplorer builds its three-panel layout the same way. A
    // filter may be set repeatedly as long as none of the values is ApiOptionsFilter.NONE.
    apiOptions.filter( ApiOptionsFilter.GENERAL_ROMAN ).appendTo( '#generalRomanOptions' );

    // Controls first, then the calendar: emit() is a synchronous forEach in registration
    // order and WebCalendar's own calendarFetched listener throws on empty data, which
    // would abort the loop before the messages render. listenTo() fixes that order.
    viewer.listenTo( apiClient );

    // Configure multiselect based on Bootstrap version. This stays with the consumer:
    // CalendarControls deliberately absorbs no jQuery/Bootstrap-plugin treatment of an
    // individual ApiOptions input.
    const multiselectConfig = {
        buttonWidth: '100%',
        buttonClass: isBS5 ? 'form-select' : 'btn btn-default',
        templates: isBS5
            ? { button: '<button type="button" class="multiselect dropdown-toggle" data-bs-toggle="dropdown"><span class="multiselect-selected-text"></span></button>' }
            : { button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>' }
    };
    const holydaysInput = apiOptions.holydaysOfObligationInput._domElement;
    $(holydaysInput).multiselect(multiselectConfig);

    /**
     * Repaints the multiselect button from a selection payload.
     *
     * @param {{predeterminedInputs: ReadonlyArray<string>}} selection - The payload.
     * @returns {void}
     */
    const paint = ({ predeterminedInputs }) => {
        setHolyDaysOfObligationBgColor(holydaysInput, predeterminedInputs.includes('holydaysOfObligationInput'));
    };

    // `selection` is a synchronous, race-free read and onSelectionChange() deliberately
    // does not fire on subscribe, so the initial paint is this one extra line. The
    // callback then fires once per user action, coalesced onto a microtask, and only
    // when the payload actually changed -- a locale change, or reselecting the option
    // already selected, notifies nobody. This replaces a raw `change` listener on the
    // calendar select plus a `value === ''` test, which is the library's own domain
    // knowledge re-derived by hand.
    paint(viewer.controls.selection);
    viewer.controls.onSelectionChange((selection) => {
        $(holydaysInput).multiselect('rebuild');
        paint(selection);
    });

    // Dispatched three ways from the data-calendartype attribute CalendarSelect puts on
    // each option -- General Roman for the null option this select starts on, national,
    // or diocesan -- so the first calendar shown is always the one the form describes.
    // The promise is ours to handle: since 2.0.0 the fetch methods reject rather than
    // logging and swallowing, so a bare call would surface as an unhandled rejection.
    viewer.fetch().catch((error) => {
        // `url` is only carried by the ApiClientError a failed REQUEST rejects with. A
        // failure raised before the request goes out -- an unserviceable rite, an unusable
        // locale -- rejects with a plain Error, so naming the URL unconditionally printed
        // a literal "from undefined".
        reportFailure(`Could not fetch the initial calendar${error.url ? ` from ${error.url}` : ''}: ${error.message}`);
    });
}).catch((error) => {
    // Since 2.0.0 init() rejects rather than resolving to false, so the
    // `apiClient instanceof ApiClient` guard this example used to need is gone.
    // This also catches anything thrown while building the page above; `error.url`
    // is only set on the ApiClientError that a failed request rejects with.
    reportFailure(`Could not start the Liturgical Calendar example: ${error.message}`);
});
