import { ApiClient, CalendarSelect, ApiOptions, Input, WebCalendar, Grouping, ColorAs, Column, ColumnOrder, DateFormat, GradeDisplay } from 'https://cdn.jsdelivr.net/npm/@liturgical-calendar/components-js@1.3.1/+esm';

Input.setGlobalInputClass('form-select');
Input.setGlobalLabelClass('form-label d-block mb-1');
Input.setGlobalWrapper('div');
Input.setGlobalWrapperClass('form-group col col-md-3');

/**
 * Sets the background color of the holy days of obligation select button based on the value of the calendar select element.
 * If the value is empty, the background color is removed.
 * If the value is not empty, the background color is set to #e9ecef.
 * @param {string} calendarSelectValue - The value of the calendar select element.
 */
function setHolyDaysOfObligationBgColor(calendarSelectValue) {
    if (calendarSelectValue === '') {
        $('#holydays_of_obligation').multiselect('deselectAll', false).multiselect('selectAll', false).parent().find('button.multiselect').removeAttr('style');
    } else {
        $('#holydays_of_obligation').parent().find('button.multiselect').css('background-color', '#e9ecef');
    }
}

ApiClient.init(BaseURL ?? 'https://litcal.johnromanodorazio.com/api/v5/').then( (apiClient) => {
    const calendarSelect = new CalendarSelect( document.documentElement.lang || 'en-US' );
    calendarSelect.allowNull()
        .label({
            class: 'form-label d-block mb-1'
        }).wrapper({
            class: 'form-group col col-md-3'
        }).class('form-select')
        .appendTo( '#calendarOptions');

    const apiOptions = new ApiOptions( document.documentElement.lang || 'en-US' );
    apiOptions._localeInput.defaultValue( document.documentElement.lang || 'en' );
    apiOptions._acceptHeaderInput.hide();
    apiOptions._yearInput.class( 'form-control' ); // override the global input class
    apiOptions._ascensionInput.wrapperClass( 'form-group col col-md-2' );
    apiOptions._corpusChristiInput.wrapperClass( 'form-group col col-md-2' );
    apiOptions._eternalHighPriestInput.wrapperClass( 'form-group col col-md-2' );
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
    .attachTo( '#litcalWebcalendar' ) // the element in which the web calendar will be rendered, every time the calendar is updated
    .listenTo(apiClient);

    $('#holydays_of_obligation').multiselect({
        buttonWidth: '100%',
        buttonClass: 'form-select',
        templates: {
            button: '<button type="button" class="multiselect dropdown-toggle" data-bs-toggle="dropdown"><span class="multiselect-selected-text"></span></button>'
        },
    });

    setHolyDaysOfObligationBgColor(calendarSelect._domElement.value);

    calendarSelect._domElement.addEventListener('change', (ev) => {
        $('#holydays_of_obligation').multiselect('rebuild');
        setHolyDaysOfObligationBgColor(ev.target.value);
    });

    apiClient.fetchNationalCalendar('VA');
});
