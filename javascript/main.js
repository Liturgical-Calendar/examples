import { ApiClient, CalendarSelect, ApiOptions, Input, WebCalendar, Grouping, ColorAs, Column, ColumnOrder, DateFormat, GradeDisplay } from '@liturgical-calendar/components-js';

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
    apiOptions.linkToCalendarSelect( calendarSelect ).appendTo( '#calendarOptions' );

    apiClient.listenTo( calendarSelect ).listenTo( apiOptions );
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

    apiClient.fetchNationalCalendar('VA');
});
