"use strict";

Object.filter = (obj, predicate) => 
Object.keys(obj)
    .filter( key => predicate(obj[key]) )
    .reduce( (res, key) => (res[key] = obj[key], res), {} );

const thirdLevelDomain = window.location.hostname.split('.')[0];
const isStaging = ( thirdLevelDomain.includes( '-staging' ) || window.location.pathname.includes( '-staging' ) );
const stagingURL = isStaging ? '-staging' : '';
const endpointV = isStaging ? 'dev' : 'v3';
const endpointURL = `https://litcal.johnromanodorazio.com/api/${endpointV}/LitCalEngine.php`;
const metadataURL = `https://litcal.johnromanodorazio.com/api/${endpointV}/LitCalMetadata.php`;

let messages = null,
    loadMessages = (locale,callback) => {
        $.getJSON( `locales/${locale}.json`, data => {
            messages = data;
            callback();
        });
    },
    today = new Date(),
    $Settings = {
        "year": today.getFullYear(),
        "epiphany": "JAN6",
        "ascension": "SUNDAY",
        "corpuschristi": "SUNDAY",
        "locale": "la",
        "returntype": "JSON"
    },
    $events = [],
    pad = n => n < 10 ? '0' + n : n,
    litGrade = new LitGrade($Settings.locale),
    genLitCal = () => {
        $.ajax({
            method: 'POST',
            data: $Settings,
            url: endpointURL,
            success: LitCalData => {
                console.log(LitCalData);
                if (LitCalData.hasOwnProperty("LitCal")) {
                    createHeader();
                    let $LitCal = LitCalData.LitCal;

                    for (let key in $LitCal) {
                        $LitCal[key].date = new Date($LitCal[key].date * 1000); //transform PHP timestamp to javascript date object
                    }
                    let $LitCalKeys = Object.keys($LitCal);
                    for (let $keyindex = 0; $keyindex < $LitCalKeys.length; $keyindex++) {
                        let $keyname = $LitCalKeys[$keyindex];
                        let $festivity = $LitCal[$keyname];
                        let dy = ($festivity.date.getDay() === 0 ? 7 : $festivity.date.getDay()); // get the day of the week
                        let $possibleColors = $festivity.color.split(",");
                        let $CSScolor = $possibleColors[0];
                        let $textColor = ($CSScolor === 'white' || $CSScolor === 'pink' ? 'black' : 'white');
                        let $festivityGrade = '';
                        if ($festivity.hasOwnProperty('displayGrade') && $festivity.displayGrade !== '') {
                            $festivityGrade = $festivity.displayGrade + ', ';
                        }
                        else if (dy !== 7 || $festivity.grade > 3) {
                            //$festivityGrade = _G($festivity.grade) + ', ';
                            $festivityGrade = litGrade.i18n( $festivity.grade ) + ', ';
                        }

                        let $description = '<b>' + $festivity.name + '</b><br>' + $festivityGrade + '<i>' + _CC($festivity.color, true) + '</i><br><i style="font-size:.8em;">' + _C($festivity.common) + '</i>' + ($festivity.hasOwnProperty('liturgicalYear') ? '<br>' + $festivity.liturgicalYear : '');
                        $events[$keyindex] = {
                            title: $festivity.name,
                            start: $festivity.date.getUTCFullYear() + '-' + pad($festivity.date.getUTCMonth() + 1) + '-' + pad($festivity.date.getUTCDate()),
                            backgroundColor: $CSScolor,
                            textColor: $textColor,
                            description: $description,
                            idx: $festivity.eventIdx
                        };

                        if ($keyindex === $LitCalKeys.length - 1) {
                            $('#spinnerWrapper').fadeOut('slow');
                        }
                    }

                    let calendarEl = document.getElementById('calendar'),
                        fullCalendarSettings = {
                            headerToolbar: {
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,listMonth'
                            },
                            dayMaxEvents: true, // allow "more" link when too many events
                            events: $events,
                            firstDay: 0,
                            eventOrder: 'idx',
                            eventDidMount: info => {
                                $(info.el).attr('data-tooltip', encodeURI(info.event.extendedProps.description));
                            }
                        };
                    if ($Settings.locale !== 'en') {
                        fullCalendarSettings.locale = $Settings.locale;
                    }
                    if (parseInt($Settings.year) !== today.getFullYear()) {
                        fullCalendarSettings.initialDate = $Settings.year + '-01-01';
                    }
                    let calendar = new FullCalendar.Calendar(calendarEl, fullCalendarSettings);

                    calendar.render();

                    //even though the following code works for Latin, the Latin however is not removed for successive renders
                    //in other locales. Must have something to do with how the renders are working, like an append or something?
                    /*if ($Settings.locale === 'la') {
                        console.log('locale is Latin, now fixing days of the week');
                        $('.fc-day').each((idx, el) => {
                            $(el).find('a.fc-col-header-cell-cushion').text(dayNamesShort[idx]);
                            console.log($(el).find('a.fc-col-header-cell-cushion').text());
                        });
                    }
                    */
                    $('[data-tooltip]').tooltip({
                        items: "[data-tooltip]",
                        content: function() {
                            return decodeURI( $(this).attr('data-tooltip') );
                        }
                    });

                }
                if (LitCalData.hasOwnProperty('Messages')) {
                    $('#LitCalMessages tbody').empty();
                    LitCalData.Messages.forEach((message, idx) => {
                        $('#LitCalMessages tbody').append(`<tr><td>${idx}</td><td>${message}</td></tr>`);
                    });
                }

            },
            error: (jqXHR, textStatus, errorThrown) => {
                console.log('(' + textStatus + ') ' + errorThrown);
                console.log(jqXHR.getAllResponseHeaders);
                console.log(jqXHR.responseText);
            }
        });
    },
    createHeader = () => {
        document.title = __("Generate Roman Calendar");
        $('#settingsWrapper').dialog("destroy").remove();
        $('header').empty();
        let templateStr = __('HTML presentation elaborated by JAVASCRIPT using an AJAX request to a %s');
        templateStr = templateStr.replace('%s', `<a href="${endpointURL}">PHP engine</a>`);
        let $header = `
    <h1 style="text-align:center;">${__('Liturgical Calendar Calculation for a Given Year')} (${$Settings.year})</h1>
    <h2 style="text-align:center;">${templateStr}</h2>
    <div style="text-align:center;border:2px groove White;border-radius:6px;width:60%;margin:0px auto;padding-bottom:6px;">
    <h3>${__('Configurations being used to generate this calendar')}:</h3>
    <span>${__('YEAR')} = ${$Settings.year}, ${__('EPIPHANY')} = ${$Settings.epiphany}, ${__('ASCENSION')} = ${$Settings.ascension}, CORPUS CHRISTI = ${$Settings.corpuschristi}, LOCALE = ${$Settings.locale}</span>
    </div>`,
            $tbheader = `<tr><th>${__("Month")}</th><th>${__("Date in Gregorian Calendar")}</th><th>${__("General Roman Calendar Festivity")}</th><th>${__("Grade of the Festivity")}</th></tr>`,
            $settingsDialog = `<div id="settingsWrapper"><form id="calSettingsForm"><table id="calSettings">
<tr><td colspan="2"><label>${__('YEAR')}: </td><td colspan="2"><input type="number" name="year" id="year" min="1969" max="9999" value="${$Settings.year}" /></label></td></tr>
<tr><td><label>${__('LOCALE')}: </td><td><select name="locale" id="locale"><option value="en" ${($Settings.locale === "en" ? " SELECTED" : "")}>ENGLISH</option><option value="it" ${($Settings.locale === "it" ? " SELECTED" : "")}>ITALIANO</option><option value="la" ${($Settings.locale === "la" ? " SELECTED" : "")}>LATINO</option></select></label></td><td>${__('NATIONAL PRESET')}: </td><td><select id="nationalcalendar" name="nationalcalendar"><option value=""></option><option value="VATICAN" ${($Settings.nationalcalendar === "VATICAN" ? " SELECTED" : "")}>${__('Vatican')}</option><option value="ITALY" ${($Settings.nationalcalendar === "ITALY" ? " SELECTED" : "")}>${__('Italy')}</option><option value="USA" ${($Settings.nationalcalendar === "USA" ? " SELECTED" : "")}>USA</option></select></td></tr>
<tr><td><label>${__('EPIPHANY')}: </td><td><select name="epiphany" id="epiphany"><option value="JAN6" ${($Settings.epiphany === "JAN6" ? " SELECTED" : "")}>${__('January 6')}</option><option value="SUNDAY_JAN2_JAN8" ${($Settings.epiphany === "SUNDAY_JAN2_JAN8" ? " SELECTED" : "")}>${__('Sunday Jan 2↔Jan 8')}</option></select></label></td><td>${__('DIOCESAN PRESET')}: </td><td><select id="diocesancalendar" name="diocesancalendar" ${($Settings.nationalcalendar == '' || $Settings.nationalcalendar == 'VATICAN' ) ? 'disabled' : ''}></select></td></tr>
<tr><td><label>${__('ASCENSION')}: </td><td><select name="ascension" id="ascension"><option value="THURSDAY" ${($Settings.ascension === "THURSDAY" ? " SELECTED" : "")}>${__('Thursday')}</option><option value="SUNDAY" ${($Settings.ascension === "SUNDAY" ? " SELECTED" : "")}>${__('Sunday')}</option></select></label></td><td></td><td></td></tr>
<tr><td><label>CORPUS CHRISTI: </td><td><select name="corpuschristi" id="corpuschristi"><option value="THURSDAY" ${($Settings.corpuschristi === "THURSDAY" ? " SELECTED" : "")}>${__('Thursday')}</option><option value="SUNDAY" ${($Settings.corpuschristi === "SUNDAY" ? " SELECTED" : "")}>${__('Sunday')}</option></select></label></td><td></td><td></td></tr>
<tr><td colspan="4" style="text-align:center;"><input type="submit" id="generateLitCal" value="${__("Generate Roman Calendar")}" /></td></tr>
</table></form></div>`;
        $('header').html($header);
        $('#LitCalTable thead').html($tbheader);
        $('#LitCalMessages thead').html(`<tr><th colspan=2 style="text-align:center;">${__("Information about the current calculation of the Liturgical Year")}</th></tr>`);
        $('#generateLitCal').button();

        $($settingsDialog).dialog({
            title: __('Customize options for generating the Roman Calendar'),
            modal: true,
            width: '80%',
            show: {
                effect: 'fade',
                duration: 500
            },
            hide: {
                effect: 'fade',
                duration: 500
            },
            autoOpen: false
        });

        if($Settings.nationalcalendar === 'USA'){
            if(Object.keys($DiocesesUSA).length > 0){
                $('#diocesancalendar').prop('disabled', false);
                $('#diocesancalendar').append('<option value=""></option>');
                for(const [key, value] of Object.entries($DiocesesUSA)){
                    $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
                }
            } else {
                $('#diocesancalendar').prop('disabled', true);
            }
        } else if ($Settings.nationalcalendar === 'ITALY'){
            if(Object.keys($DiocesesItaly).length > 0){
                $('#diocesancalendar').prop('disabled', false);
                $('#diocesancalendar').append('<option value=""></option>');
                for(const [key, value] of Object.entries($DiocesesItaly)){
                    $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
                }
            } else {
                $('#diocesancalendar').prop('disabled', true);
            }
        }

    },
    __ = key => {
        if ( messages !== null && typeof messages === 'object') {
            if ( messages.hasOwnProperty(key) ) {
                return messages[key];
            }
        }
        return key;
    },
    _C = $common => {
        if ($common !== "" && $common !== "Proper") {
            let $commons = $common.split(",");
            $commons = $commons.map($txt => {
                let $commonArr = $txt.split(":");
                let $commonGeneral = __($commonArr[0]);
                let $commonSpecific = $commonArr.length > 1 && $commonArr[1] != "" ? __($commonArr[1]) : "";
                let $commonKey = '';
                //$txt = str_replace(":", ": ", $txt);
                switch ($commonGeneral) {
                    case __("Dedication of a Church"):
                        $commonKey = "of (SING_FEMM)";
                        break;
                    case __("Blessed Virgin Mary"):
                        $commonKey = "of (SING_FEMM)";
                        break;
                    case __("Virgins"):
                        $commonKey = "of (PLUR_FEMM)";
                        break;
                    case __("Martyrs"):
                    case __("Pastors"):
                    case __("Doctors"):
                    case __("Holy Men and Women"):
                        $commonKey = "of (PLUR_MASC)";
                        break;
                    default:
                        $commonKey = "of (SING_MASC)";
                }
                return __("From the Common") + " " + __($commonKey) + " " + $commonGeneral + ($commonSpecific != "" ? ": " + $commonSpecific : "");
            });
            $common = $commons.join("; " + __("or") + " ");
        } else if ($common == "Proper") {
            $common = __("Proper");
        }
        return $common;
    },
    _CC = ($colorstr, html) => {
        if (html === true) {
            if ($colorstr.indexOf(',') !== -1) {
                console.log($colorstr);
                let $colors = $colorstr.split(",");
                $colors = $colors.map($txt => {
                    let $clr = $txt === 'white' ? 'gray' : $txt;
                    return '<span style="color:' + $clr + ';">' + __($txt) + '</span>';
                });
                return $colors.join(" " + __("or") + " ");
            }
            else {
                let $highlightColor = $colorstr === 'pink' ? 'text-shadow:1px 1px 3px DarkGray;' : '';
                return '<span style="color:' + ($colorstr === 'white' ? 'gray' : $colorstr) + ';' + $highlightColor + '">' + __($colorstr) + '</span>';
            }
        }
        else {
            if ($colorstr.indexOf(',') !== -1) {
                console.log($colorstr);
                let $colors = $colorstr.split(",");
                $colors = $colors.map( $txt => __($txt) );
                return $colors.join(" " + __("or") + " ");
            }
            else {
                return __($colorstr);
            }
        }
    },
    //dayNames = ['Dies Solis', 'Dies Lunae', 'Dies Martis', 'Dies Mercurii', 'Dies Iovis', 'Dies Veneris', 'Dies Saturni'],
    //dayNamesShort = ['Sol', 'Lun', 'Mart', 'Merc', 'Iov', 'Ven', 'Sat'],
    $index = {},
    $DiocesesUSA,
    $DiocesesItaly;

jQuery.ajax({
    url: metadataURL,
    dataType: 'json',
    statusCode: {
        404: () => { console.log('The JSON definition "nations/index.json" does not exist yet.'); }
    },
    success: data => {
        console.log('retrieved data from index file:');
        console.log(data);
        $index = data;
        $DiocesesUSA = Object.filter($index, key => key.nation == "USA");
        $DiocesesItaly = Object.filter($index, key => key.nation == "ITALY");
    }
});


$(document).ready(() => {
    if( typeof Cookies.get( 'litCalSettings' ) !== 'undefined' ) {
        $Settings = JSON.parse( Cookies.get( 'litCalSettings' ) );
    } else {
        Cookies.set( 'litCalSettings', JSON.stringify($Settings), { secure: true } );
    }
    if( $Settings.locale !== 'en' ){
        loadMessages( $Settings.locale, genLitCal);
    } else {
        messages = null;
        genLitCal();
    }
    //document.title = __("Generate Roman Calendar");
    $('.backNav').attr('href',`https://litcal${stagingURL}.johnromanodorazio.com/usage.php`);

    $(document).on('click', '#openSettings', ev => { $('#settingsWrapper').dialog("open"); });

    $(document).on("submit", '#calSettingsForm', event => {
        event.preventDefault();
        let formValues = $(event.currentTarget).serializeArray();
        for (let obj of formValues) {
            $Settings[obj.name] = obj.value;
        }
        console.log('$Settings = ');
        console.log($Settings);
        $('#settingsWrapper').dialog("close");
        //createHeader();
        Cookies.set( 'litCalSettings', JSON.stringify($Settings), { secure: true } );
        litGrade = new LitGrade( $Settings.locale );
        if( $Settings.locale !== 'en' ){
            loadMessages( $Settings.locale, genLitCal);
        } else {
            messages = null;
            genLitCal();
        }
        return false;
    });

    if ($('#nationalcalendar').val() == "" || $('#nationalcalendar').val() == "VATICAN" ) {
        $('#diocesancalendar').prop('disabled', true);
    }

    $(document).on('change', '#nationalcalendar', ev => {
        /*
        $('#diocesancalendar').empty();
        if(Object.keys($index).length > 0){
        $DiocesesList = Object.filter($index, key => key.nation == $(this).val());
        }
        if(Object.keys($DiocesesList).length > 0){
        $('#diocesancalendar').prop('disabled', false);
        for(const [key, value] of Object.entries($DiocesesList)){
            $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
        }
        } else {
        $('#diocesancalendar').prop('disabled', true);
        }
        */
        switch( $(ev.currentTarget).val() ) {
            case "VATICAN":
                $('#locale').val('la');
                $('#epiphany').val('JAN6');
                $('#ascension').val('THURSDAY');
                $('#corpuschristi').val('THURSDAY');
                $('#diocesancalendar').val("");
                $Settings.locale = 'la';
                $Settings.epiphany = 'JAN6';
                $Settings.ascension = 'THURSDAY';
                $Settings.corpuschristi = 'THURSDAY';
                $Settings.diocesancalendar = '';
                $Settings.nationalcalendar = 'VATICAN';

                $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled', true);
                break;
            case "ITALY":
                $('#locale').val('it');
                $('#epiphany').val('JAN6');
                $('#ascension').val('SUNDAY');
                $('#corpuschristi').val('SUNDAY');
                $('#diocesancalendar').prop('disabled', false).val("DIOCESIROMA");
                $Settings.locale = 'it';
                $Settings.epiphany = 'JAN6';
                $Settings.ascension = 'SUNDAY';
                $Settings.corpuschristi = 'SUNDAY';
                $Settings.nationalcalendar = 'ITALY';
                $('#calSettingsForm :input').not('#diocesancalendar').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled', true);
                $('#diocesancalendar').empty();
                if(Object.keys($DiocesesItaly).length > 0){
                $('#diocesancalendar').prop('disabled', false);
                $('#diocesancalendar').append('<option value=""></option>');
                for(const [key, value] of Object.entries($DiocesesItaly)){
                    $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
                }
                } else {
                $('#diocesancalendar').prop('disabled', true);
                }
                break;
            case "USA":
                $('#locale').val('en');
                $('#epiphany').val('SUNDAY_JAN2_JAN8');
                $('#ascension').val('SUNDAY');
                $('#corpuschristi').val('SUNDAY');
                $('#diocesancalendar').val("");
                $Settings.locale = 'en';
                $Settings.epiphany = 'SUNDAY_JAN2_JAN8';
                $Settings.ascension = 'SUNDAY';
                $Settings.corpuschristi = 'SUNDAY';
                $Settings.diocesancalendar = '';
                $Settings.nationalcalendar = 'USA';
                $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled', true);

                //TODO: once the data for the Diocese of Rome has been define through the UI interface
                //      and the relative JSON file created, the following operation should be abstracted for any nation in the list
                //      and not applied here with the hardcoded value "USA"
                //      The logic has been started up above, before the 'switch'
                //      However we have to keep in mind that Rome groups together the celebrations for the whole Lazio region in a single booklet
                //      This would mean that we have to create the ability of creating groups, to group together the data from more than one diocese
                //      Perhaps another value can be added to the index, to indicate a group definition, such that all the diocesan calendars belonging to that group can be pulled...
                $('#diocesancalendar').empty();
                if(Object.keys($DiocesesUSA).length > 0){
                $('#diocesancalendar').prop('disabled', false);
                $('#diocesancalendar').append('<option value=""></option>');
                for(const [key, value] of Object.entries($DiocesesUSA)){
                    $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
                }
                } else {
                    $('#diocesancalendar').prop('disabled', true);
                }
                break;
            default:
                $('#calSettingsForm :input').prop('disabled', false);
                $('#diocesancalendar').val("").prop('disabled', true);
                $Settings.nationalcalendar = '';
        }
    });

    $(document).on('change', '#diocesancalendar', ev => { $Settings.diocesancalendar = $(ev.currentTarget).val(); });

});

class LitGrade {
    static HIGHER_SOLEMNITY = Symbol('HigherSolemnity');
    static SOLEMNITY        = Symbol('Solemnity');
    static FEAST_LORD       = Symbol('FeastLord');
    static FEAST            = Symbol('Feast');
    static MEMORIAL         = Symbol('Memorial');
    static MEMORIAL_OPT     = Symbol('OptionalMemorial');
    static COMMEMORATION    = Symbol('Commemoration');
    static WEEKDAY          = Symbol('Weekday');
    static valuesAsInt      = [ 0, 1, 2, 3, 4, 5, 6, 7 ];
    static values           = [
        this.HIGHER_SOLEMNITY,
        this.SOLEMNITY,
        this.FEAST_LORD,
        this.FEAST,
        this.MEMORIAL,
        this.MEMORIAL_OPT,
        this.COMMEMORATION,
        this.WEEKDAY
    ];
    static valueToEnum      = {
        7:  this.HIGHER_SOLEMNITY,
        6:  this.SOLEMNITY,
        5:  this.FEAST_LORD,
        4:  this.FEAST,
        3:  this.MEMORIAL,
        2:  this.MEMORIAL_OPT,
        1:  this.COMMEMORATION,
        0:  this.WEEKDAY
    }
    static isValid = ( value ) => {
        if( typeof value === 'number' ) {
            return this.valuesAsInt.includes( value );
        } else {
            return this.values.includes( value );
        }
    };
    static enumFromValue = ( value ) => this.valueToEnum[value];
    #locale  = 'la';
    constructor( locale ) {
        this.#locale = locale;
    }
    i18n = ( value, html = true ) => {
        if( typeof value === 'number' ){
            value = this.enumFromValue( value );
        }
        switch( value ) {
            case WEEKDAY:
                /**translators: liturgical rank. Keep lowercase  */
                grade = this.locale === 'la' ? 'feria'                 : __( "weekday" );
                tags = ['<i>','</i>'];
            break;
            case COMMEMORATION:
                /**translators: liturgical rank. Keep Capitalized  */
                grade = this.locale === 'la' ? 'Commemoratio'          : __( "Commemoration" );
                tags = ['<i>','</i>'];
            break;
            case MEMORIAL_OPT:
                /**translators: liturgical rank. Keep Capitalized  */
                grade = this.locale === 'la' ? 'Memoria ad libitum'    : __( "Optional memorial" );
                tags = ['',''];
            break;
            case MEMORIAL:
                /**translators: liturgical rank. Keep Capitalized  */
                grade = this.locale === 'la' ? 'Memoria obligatoria'   : __( "Memorial" );
                tags = ['',''];
            break;
            case FEAST:
                /**translators: liturgical rank. Keep UPPERCASE  */
                grade = this.locale === 'la' ? 'FESTUM'                : __( "FEAST" );
                tags = ['',''];
            break;
            case FEAST_LORD:
                /**translators: liturgical rank. Keep UPPERCASE  */
                grade = this.locale === 'la' ? 'FESTUM DOMINI'         : __( "FEAST OF THE LORD" );
                tags = ['<b>','</b>'];
            break;
            case SOLEMNITY:
                /**translators: liturgical rank. Keep UPPERCASE  */
                grade = this.locale === 'la' ? 'SOLLEMNITAS'           : __( "SOLEMNITY" );
                tags = ['<b>','</b>'];
            break;
            case HIGHER_SOLEMNITY:
                /**translators: liturgical rank. Keep lowercase  */
                grade = this.locale === 'la' ? 'celebratio altioris ordinis quam sollemnitatis' : __( "celebration with precedence over solemnities" );
                tags = ['<b><i>','</i></b>'];
            break;
            default:
                grade = this.locale === 'la' ? 'feria'                 : __( "weekday" );
                tags = ['',''];
        }
        return html ? tags[0] . grade . tags[1] : grade;
    }
}
