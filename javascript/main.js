import { ApiClient, ApiOptionsFilter, CalendarViewer, Input, Grouping, ColorAs, Column, ColumnOrder, DateFormat, GradeDisplay } from '@liturgical-calendar/components-js';

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

// Use appropriate classes based on Bootstrap version
const selectClass = isBS5 ? 'form-select' : 'form-control';

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

Input.setGlobalInputClass(selectClass);
Input.setGlobalLabelClass('form-label d-block mb-1');
Input.setGlobalWrapper('div');
// The narrowest of the two widths any ApiOptions input takes; the wider ones
// override it individually below.
Input.setGlobalWrapperClass(formGroupClass(2));

/**
 * Sets the background color of the holy days of obligation select button based on the value of the calendar select element.
 * If the value is empty, the background color is removed.
 * If the value is not empty, the background color is set to #e9ecef.
 * @param {HTMLSelectElement} hdobInput - The holy days of obligation select element.
 * @param {string} calendarSelectValue - The value of the calendar select element.
 */
function setHolyDaysOfObligationBgColor(hdobInput, calendarSelectValue) {
    if (calendarSelectValue === '') {
        $(hdobInput).multiselect('deselectAll', false).multiselect('selectAll', false).parent().find('button.multiselect').removeAttr('style');
    } else {
        $(hdobInput).parent().find('button.multiselect').css('background-color', '#e9ecef');
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
            select: selectClass,
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

    // The theme bag deliberately does not reach ApiOptions' inputs -- ApiOptions bundles
    // a variable number of them depending on the filter, so there is no fixed set of
    // per-child keys to name -- so these are still reached directly, and the widths that
    // differ from the global col-md-2 are still set one by one.
    const apiOptions = viewer.controls.apiOptions;
    apiOptions._acceptHeaderInput.hide(); // read at append time; see above
    apiOptions._yearInput.class( 'form-control' ); // override the global input class
    // The two inputs with the longest option labels get the extra width; the rest
    // keep the global col-md-2.
    apiOptions._epiphanyInput.wrapperClass( formGroupClass(3) );
    apiOptions._holydaysOfObligationInput.wrapperClass( formGroupClass(3) );

    // Row one: the rite and calendar selects, then the inputs the ALL_CALENDARS filter
    // selects -- locale, year type and year, in that order, the Accept header input
    // having been hidden above. The messages slot renders the API's messages array,
    // building each row with textContent rather than the innerHTML this example used to
    // interpolate the API's strings into.
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
    const holydaysInput = apiOptions._holydaysOfObligationInput._domElement;
    $(holydaysInput).multiselect(multiselectConfig);

    const calendarSelectElement = viewer.controls.calendarSelect._domElement;
    setHolyDaysOfObligationBgColor(holydaysInput, calendarSelectElement.value);

    calendarSelectElement.addEventListener('change', (ev) => {
        $(holydaysInput).multiselect('rebuild');
        setHolyDaysOfObligationBgColor(holydaysInput, ev.target.value);
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
        console.error(`Could not fetch the initial calendar${error.url ? ` from ${error.url}` : ''}: ${error.message}`);
    });
}).catch((error) => {
    // Since 2.0.0 init() rejects rather than resolving to false, so the
    // `apiClient instanceof ApiClient` guard this example used to need is gone.
    // This also catches anything thrown while building the page above; `error.url`
    // is only set on the ApiClientError that a failed request rejects with.
    console.error(`Could not start the Liturgical Calendar example: ${error.message}`);
});
