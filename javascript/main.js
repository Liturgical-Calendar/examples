import { ApiClient, CalendarSelect, RiteSelect, ApiOptions, Input, WebCalendar, Grouping, ColorAs, Column, ColumnOrder, DateFormat, GradeDisplay } from '@liturgical-calendar/components-js';

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
const formGroupClass = isBS5 ? 'form-group col col-md-3' : 'form-group col-md-3';

Input.setGlobalInputClass(selectClass);
Input.setGlobalLabelClass('form-label d-block mb-1');
Input.setGlobalWrapper('div');
Input.setGlobalWrapperClass(formGroupClass);

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
    // Appended before the calendar select so it reads first in the form row.
    // It must also be in the DOM before linkToCalendarSelect() below, which
    // reads this element to attach the rite-change listener.
    //
    // RiteSelect has no wrapper() of its own — unlike CalendarSelect — so the
    // grid column it sits in is built here. Doing it in JS rather than in the
    // markup keeps it on the same Bootstrap-version-dependent class as every
    // other control in this row.
    //
    // No `text`: omitting it lets RiteSelect supply its own localized label.
    const riteSelectWrapper = document.createElement('div');
    riteSelectWrapper.className = formGroupClass;
    document.querySelector('#calendarOptions').appendChild(riteSelectWrapper);

    const riteSelect = new RiteSelect( document.documentElement.lang || 'en-US' );
    riteSelect.label({
            class: 'form-label d-block mb-1'
        }).class(selectClass);
    riteSelect.appendTo( riteSelectWrapper );

    const calendarSelect = new CalendarSelect( document.documentElement.lang || 'en-US' );
    calendarSelect.allowNull()
        .label({
            class: 'form-label d-block mb-1'
        }).wrapper({
            class: formGroupClass
        }).class(selectClass)
        .appendTo( '#calendarOptions');

    const apiOptions = new ApiOptions( document.documentElement.lang || 'en-US' );
    apiOptions._localeInput.defaultValue( document.documentElement.lang || 'en' );
    apiOptions._acceptHeaderInput.hide();
    apiOptions._yearInput.class( 'form-control' ); // override the global input class
    const smallerFormGroupClass = isBS5 ? 'form-group col col-md-2' : 'form-group col-md-2';
    apiOptions._ascensionInput.wrapperClass( smallerFormGroupClass );
    apiOptions._corpusChristiInput.wrapperClass( smallerFormGroupClass );
    apiOptions._eternalHighPriestInput.wrapperClass( smallerFormGroupClass );
    // Passing riteSelect marks the rite as explicit, so it is emitted as a path
    // segment and the calendar select is rebuilt whenever the rite changes. The
    // Ambrosian rite has no national tier and fixes Epiphany, Ascension, Corpus
    // Christi and the Eternal High Priest in its own books, so ApiOptions also
    // disables those four inputs for as long as it is selected.
    apiOptions.linkToCalendarSelect( calendarSelect ).linkToRiteSelect( riteSelect ).appendTo( '#calendarOptions' );

    // The rite select must be wired to the client as well as to ApiOptions:
    // ApiOptions rebuilds the calendar select on a rite change, but only the
    // client turns the rite into a path segment. Without this the form would
    // read `ambrosian` while the request still went to /calendar/roman/.
    apiClient.listenTo( calendarSelect ).listenTo( riteSelect ).listenTo( apiOptions );
    apiClient._eventBus.on( 'calendarFetched', (LitCalData) => {
        if (LitCalData.hasOwnProperty('messages')) {
            const messagesHtml = LitCalData.messages.map((message, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${idx}</td><td>${message}</td>`;
                return tr;
            });
            document.querySelector('#LitCalMessages tbody').replaceChildren(...messagesHtml);
        }
    });

    const webCalendar = new WebCalendar();
    webCalendar.id('LitCalTable')
    .firstColumnGrouping(Grouping.BY_LITURGICAL_SEASON)
    .psalterWeekColumn() // add psalter week column as the right hand most column
    .removeHeaderRow() // we don't need to see the header row
    .seasonColor(ColorAs.CSS_CLASS)
    .seasonColorColumns(Column.LITURGICAL_SEASON)
    .eventColor(ColorAs.INDICATOR)
    .eventColorColumns(Column.EVENT_DETAILS)
    .monthHeader() // enable month header at the start of each month
    .dateFormat(DateFormat.DAY_ONLY)
    .columnOrder(ColumnOrder.GRADE_FIRST)
    .gradeDisplay(GradeDisplay.ABBREVIATED)
    .listenTo(apiClient);
    webCalendar.appendTo( '#litcalWebcalendar' ); // the element in which the web calendar will be rendered, every time the calendar is updated

    // Configure multiselect based on Bootstrap version
    const multiselectConfig = {
        buttonWidth: '100%',
        buttonClass: isBS5 ? 'form-select' : 'btn btn-default',
        templates: isBS5
            ? { button: '<button type="button" class="multiselect dropdown-toggle" data-bs-toggle="dropdown"><span class="multiselect-selected-text"></span></button>' }
            : { button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>' }
    };
    $(apiOptions._holydaysOfObligationInput._domElement).multiselect(multiselectConfig);

    setHolyDaysOfObligationBgColor(apiOptions._holydaysOfObligationInput._domElement, calendarSelect._domElement.value);

    calendarSelect._domElement.addEventListener('change', (ev) => {
        $(apiOptions._holydaysOfObligationInput._domElement).multiselect('rebuild');
        setHolyDaysOfObligationBgColor(apiOptions._holydaysOfObligationInput._domElement, ev.target.value);
    });

    // Since 2.0.0 the fetch methods return a promise that rejects rather than
    // logging the failure and swallowing it, so a bare call would surface as an
    // unhandled rejection.
    apiClient.fetchNationalCalendar('VA').catch((error) => {
        console.error(`Could not fetch the initial calendar from ${error.url}: ${error.message}`);
    });
}).catch((error) => {
    // Since 2.0.0 init() rejects rather than resolving to false, so the
    // `apiClient instanceof ApiClient` guard this example used to need is gone.
    // This also catches anything thrown while building the page above; `error.url`
    // is only set on the ApiClientError that a failed request rejects with.
    console.error(`Could not start the Liturgical Calendar example: ${error.message}`);
});
