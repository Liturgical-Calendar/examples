const thirdLevelDomain = window.location.hostname.split('.')[0];
const isStaging = ( thirdLevelDomain === 'litcal' || thirdLevelDomain === 'litcal-staging' || window.location.pathname.includes( '-staging' ) );
const stagingURL = isStaging ? '-staging' : '';
const endpointV = isStaging ? 'dev' : 'v3';
const endpointURL = `https://litcal.johnromanodorazio.com/api/${endpointV}/LitCalEngine.php`;
const metadataURL = `https://litcal.johnromanodorazio.com/api/${endpointV}/LitCalMetadata.php`;

let today = new Date(),
    $Settings = {
        "year": today.getUTCFullYear(),
        "epiphany": "JAN6",
        "ascension": "SUNDAY",
        "corpusChristi": "SUNDAY",
        "locale": "LA",
        "returntype": "JSON"
    },
    IntlDTOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    },
    IntlMonthFmt = {
        month: 'long',
        timeZone: 'UTC'
    },
    countSameDayEvents = ($currentKeyIndex, $EventsArray, $cc) => {
        let $Keys = Object.keys($EventsArray);
        let $currentFestivity = $EventsArray[$Keys[$currentKeyIndex]];
        //console.log("currentFestivity: " + $currentFestivity.name + " | " + $currentFestivity.date);
        if ($currentKeyIndex < $Keys.length - 1) {
            let $nextFestivity = $EventsArray[$Keys[$currentKeyIndex + 1]];
            //console.log("nextFestivity: " + $nextFestivity.name + " | " + $nextFestivity.date);
            if ($nextFestivity.date.getTime() === $currentFestivity.date.getTime()) {
                //console.log("We have an occurrence!");
                $cc.count++;
                countSameDayEvents($currentKeyIndex + 1, $EventsArray, $cc);
            }
        }
    },
    countSameMonthEvents = ($currentKeyIndex, $EventsArray, $cm) => {
        let $Keys = Object.keys($EventsArray);
        let $currentFestivity = $EventsArray[$Keys[$currentKeyIndex]];
        if ($currentKeyIndex < $Keys.length - 1) {
            let $nextFestivity = $EventsArray[$Keys[$currentKeyIndex + 1]];
            if ($nextFestivity.date.getUTCMonth() == $currentFestivity.date.getUTCMonth()) {
                $cm.count++;
                countSameMonthEvents($currentKeyIndex + 1, $EventsArray, $cm);
            }
        }
    },
    /*ordSuffix = ord => {
        var ord_suffix = ''; //st, nd, rd, th
        if (ord === 1 || (ord % 10 === 1 && ord != 11)) {
            ord_suffix = 'st';
        } else if (ord === 2 || (ord % 10 === 2 && ord != 12)) {
            ord_suffix = 'nd';
        } else if (ord === 3 || (ord % 10 === 3 && ord != 13)) {
            ord_suffix = 'rd';
        } else {
            ord_suffix = 'th';
        }
        return ord_suffix;
    },*/
    genLitCal = () => {
        $.ajax({
            method: 'POST',
            data: $Settings,
            url: endpointURL,
            success: LitCalData => {
                console.log(LitCalData);

                let strHTML = '';
                /*
                let $YEAR = 0;
                if (LitCalData.hasOwnProperty("Settings")) {
                    $YEAR = LitCalData.Settings.YEAR;
                }
                */
                if (LitCalData.hasOwnProperty("LitCal")) {
                    let $LitCal = LitCalData.LitCal;

                    for (const key in $LitCal) {
                        if ($LitCal.hasOwnProperty(key)) {
                            $LitCal[key].date = new Date($LitCal[key].date * 1000); //transform PHP timestamp to javascript date object
                        }
                    }

                    let $dayCnt = 0;
                    const $highContrast = ['purple', 'red', 'green'];
                    let $LitCalKeys = Object.keys($LitCal);

                    let $currentMonth = -1;
                    let $newMonth = false;
                    let $cm = {
                        count: 0
                    };
                    let $cc = {
                        count: 0
                    };
                    for (let $keyindex = 0; $keyindex < $LitCalKeys.length; $keyindex++) {
                        $dayCnt++;
                        let $keyname = $LitCalKeys[$keyindex];
                        let $festivity = $LitCal[$keyname];
                        let dy = ($festivity.date.getUTCDay() === 0 ? 7 : $festivity.date.getUTCDay()); // get the day of the week

                        //If we are at the start of a new month, count how many events we have in that same month, so we can display the Month table cell
                        if ($festivity.date.getUTCMonth() !== $currentMonth) {
                            $newMonth = true;
                            $currentMonth = $festivity.date.getUTCMonth();
                            $cm.count = 0;
                            countSameMonthEvents($keyindex, $LitCal, $cm);
                        }

                        //Let's check if we have more than one event on the same day, such as optional memorials...
                        $cc.count = 0;
                        countSameDayEvents($keyindex, $LitCal, $cc);
                        //console.log($festivity.name);
                        //console.log($cc);
                        if ($cc.count > 0) {
                            console.log("we have an occurrence of multiple festivities on same day");
                            for (let $ev = 0; $ev <= $cc.count; $ev++) {
                                $keyname = $LitCalKeys[$keyindex];
                                $festivity = $LitCal[$keyname];
                                // LET'S DO SOME MORE MANIPULATION ON THE FESTIVITY->COMMON STRINGS AND THE FESTIVITY->COLOR...
                                if ($festivity.common !== "" && $festivity.common !== "Proper") {
                                    $commons = $festivity.common.split(",");
                                    $commons = $commons.map($txt => {
                                        let $common = $txt.split(":");
                                        let $commonGeneral = __($common[0]);
                                        let $commonSpecific = (typeof $common[1] !== 'undefined' && $common[1] != "") ? __($common[1]) : "";
                                        let $commonKey = '';
                                        //$txt = str_replace(":", ": ", $txt);
                                        switch ($commonGeneral) {
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
                                    $festivity.common = $commons.join("; " + __("or") + " ");
                                } else if ($festivity.common == "Proper") {
                                    $festivity.common = __($festivity.common);
                                }
                                //$festivity.color = $festivity.color.split(",")[0];

                                //check which liturgical season we are in, to use the right color for that season...
                                let $SeasonColor = "green";
                                if (($festivity.date.getTime() >= $LitCal["Advent1"].date.getTime() && $festivity.date.getTime() < $LitCal["Christmas"].date.getTime()) || ($festivity.date.getTime() >= $LitCal["AshWednesday"].date.getTime() && $festivity.date.getTime() < $LitCal["Easter"].date.getTime())) {
                                    $SeasonColor = "purple";
                                } else if ($festivity.date.getTime() >= $LitCal["Easter"].date.getTime() && $festivity.date.getTime() <= $LitCal["Pentecost"].date.getTime()) {
                                    $SeasonColor = "white";
                                } else if ($festivity.date.getTime() >= $LitCal["Christmas"].date.getTime() || $festivity.date.getTime() <= $LitCal["BaptismLord"].date.getTime()) {
                                    $SeasonColor = "white";
                                }

                                //We will apply the color for the single festivity only to it's own table cells
                                let $possibleColors =  $festivity.color.split(",");
                                let $CSScolor = $possibleColors[0];
                                /*
                                let $festivityColorString = "";
                                if($possibleColors.length === 1){
                                    $festivityColorString = __($possibleColors[0]);
                                } else if ($possibleColors.length > 1){
                                    $possibleColors = $possibleColors.map($txt => __($txt) });
                                    $festivityColorString = $possibleColors.join("</i> " + __("or") + " <i>");
                                }
                                */
                                strHTML += '<tr style="background-color:' + $SeasonColor + ';' + ($highContrast.indexOf($SeasonColor) != -1 ? 'color:white;' : '') + '">';
                                if ($newMonth) {
                                    let $monthRwsp = $cm.count + 1;
                                    strHTML += '<td class="rotate" rowspan = "' + $monthRwsp + '"><div>' + ($Settings.locale === 'LA' ? $months[$festivity.date.getUTCMonth()].toUpperCase() : new Intl.DateTimeFormat($Settings.locale.toLowerCase(), IntlMonthFmt).format($festivity.date).toUpperCase()) + '</div></td>';
                                    $newMonth = false;
                                }

                                if ($ev == 0) {
                                    let $rwsp = $cc.count + 1;
                                    let $festivity_date_str = $Settings.locale == 'LA' ? getLatinDateStr($festivity.date) : new Intl.DateTimeFormat($Settings.locale.toLowerCase(), IntlDTOptions).format($festivity.date);

                                    strHTML += '<td rowspan="' + $rwsp + '" class="dateEntry">' + $festivity_date_str + '</td>';
                                }
                                $currentCycle = ($festivity.hasOwnProperty("liturgicalYear") ? ' (' + $festivity.liturgicalYear + ')' : "");
                                $festivityGrade = '';
                                if($festivity.hasOwnProperty('displayGrade') && $festivity.displayGrade !== ''){
                                    $festivityGrade = $festivity.displayGrade;
                                }         
                                else if(dy !== 7 || $festivity.grade > 3){
                                    $festivityGrade = $GRADE[$festivity.grade];
                                }
                                strHTML += '<td style="background-color:'+$CSScolor+';' + ($highContrast.indexOf($CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + $festivity.name + $currentCycle + ' - <i>' + __($festivity.color) + '</i><br /><i>' + $festivity.common + '</i></td>';
                                strHTML += '<td style="background-color:'+$CSScolor+';' + ($highContrast.indexOf($CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + $festivityGrade + '</td>';
                                strHTML += '</tr>';
                                $keyindex++;
                            }
                            $keyindex--;

                        } else {
                            // LET'S DO SOME MORE MANIPULATION ON THE FESTIVITY->COMMON STRINGS AND THE FESTIVITY->COLOR...
                            if ($festivity.common !== "" && $festivity.common !== "Proper") {
                                $commons = $festivity.common.split(",");
                                $commons = $commons.map($txt => {
                                    let $common = $txt.split(":");
                                    let $commonGeneral = __($common[0]);
                                    let $commonSpecific = (typeof $common[1] !== 'undefined' && $common[1] != "") ? __($common[1]) : "";
                                    let $commonKey = '';
                                    //$txt = str_replace(":", ": ", $txt);
                                    switch ($commonGeneral) {
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
                                $festivity.common = $commons.join("; " + __("or") + " ");
                            } else if ($festivity.common == "Proper") {
                                $festivity.common = __($festivity.common);
                            }
                            //$festivity.color = $festivity.color.split(",")[0];

                            //check which liturgical season we are in, to use the right color for that season...
                            let $SeasonColor = "green";
                            if (($festivity.date.getTime() >= $LitCal["Advent1"].date.getTime() && $festivity.date.getTime() < $LitCal["Christmas"].date.getTime()) || ($festivity.date.getTime() >= $LitCal["AshWednesday"].date.getTime() && $festivity.date.getTime() < $LitCal["Easter"].date.getTime())) {
                                $SeasonColor = "purple";
                            } else if ($festivity.date.getTime() >= $LitCal["Easter"].date.getTime() && $festivity.date.getTime() <= $LitCal["Pentecost"].date.getTime()) {
                                $SeasonColor = "white";
                            } else if ($festivity.date.getTime() >= $LitCal["Christmas"].date.getTime() || $festivity.date.getTime() <= $LitCal["BaptismLord"].date.getTime()) {
                                $SeasonColor = "white";
                            }

                            //We will apply the color for the single festivity only to it's own table cells
                            let $possibleColors =  $festivity.color.split(",");
                            let $CSScolor = $possibleColors[0];
                            /*
                            let $festivityColorString = "";
                            if($possibleColors.length === 1){
                                $festivityColorString = __($possibleColors[0]);
                            } else if ($possibleColors.length > 1){
                                $possibleColors = $possibleColors.map($txt => __($txt) });
                                $festivityColorString = $possibleColors.join("</i> " + __("or") + " <i>");
                            }
                            */
                            strHTML += '<tr style="background-color:' + $SeasonColor + ';' + ($highContrast.indexOf($SeasonColor) != -1 ? 'color:white;' : 'color:black;') + '">';
                            if ($newMonth) {
                                let $monthRwsp = $cm.count + 1;
                                strHTML += '<td class="rotate" rowspan = "' + $monthRwsp + '"><div>' + ($Settings.locale === 'LA' ? $months[$festivity.date.getUTCMonth()].toUpperCase() : new Intl.DateTimeFormat($Settings.locale.toLowerCase(), IntlMonthFmt).format($festivity.date).toUpperCase()) + '</div></td>';
                                $newMonth = false;
                            }

                            let $festivity_date_str = $Settings.locale == 'LA' ? getLatinDateStr($festivity.date) : new Intl.DateTimeFormat($Settings.locale.toLowerCase(), IntlDTOptions).format($festivity.date);

                            strHTML += '<td class="dateEntry">' + $festivity_date_str + '</td>';
                            $currentCycle = ($festivity.hasOwnProperty("liturgicalYear") ? ' (' + $festivity.liturgicalYear + ')' : "");
                            $festivityGrade = '';
                            if(dy !== 7){
                                $festivityGrade = ($keyname === 'AllSouls' ? __("COMMEMORATION") : $GRADE[$festivity.grade]);
                            }
                            else if($festivity.grade > 3){
                                $festivityGrade = ($keyname === 'AllSouls' ? __("COMMEMORATION") : $GRADE[$festivity.grade]);
                            }              
                            if($festivity.hasOwnProperty('displayGrade') && $festivity.displayGrade !== ''){
                                $festivityGrade = $festivity.displayGrade;
                            }         
                            strHTML += '<td style="background-color:'+$CSScolor+';' + ($highContrast.indexOf($CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + $festivity.name + $currentCycle + ' - <i>' + __($festivity.color) + '</i><br /><i>' + $festivity.common + '</i></td>';
                            strHTML += '<td style="background-color:'+$CSScolor+';' + ($highContrast.indexOf($CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + $festivityGrade + '</td>';
                            strHTML += '</tr>';
                        }

                    }
                    createHeader();
                    $('#LitCalTable tbody').html(strHTML);
                    $('#dayCnt').text($dayCnt);
                    $('#LitCalMessages thead').html(`<tr><th colspan=2 style="text-align:center;">${__("Information about the current calculation of the Liturgical Year")}</th></tr>`);
                    $('#spinnerWrapper').fadeOut('slow');
                }
                if(LitCalData.hasOwnProperty('Messages')){
                    $('#LitCalMessages tbody').empty();
                    LitCalData.Messages.forEach((message,idx) => {
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
    $messages = {
        "From the Common": {
            "en": "From the Common",
            "it": "Dal Comune",
            "la": "De Communi"
        },
        "of (SING_MASC)": {
            "en": "of",
            "it": "del",
            "la": ""
        },
        "of (SING_FEMM)": {
            "en": "of the",
            "it": "della",
            "la": ""
        },
        "of (PLUR_MASC)": {
            "en": "of",
            "it": "dei",
            "la": ""
        },
        "of (PLUR_MASC_ALT)": {
            "en": "of",
            "it": "degli",
            "la": ""
        },
        "of (PLUR_FEMM)": {
            "en": "of",
            "it": "delle",
            "la": ""
        },
        /*translators: in reference to the Common of the Blessed Virgin Mary */
        "Blessed Virgin Mary": {
            "en": "Blessed Virgin Mary",
            "it": "Beata Vergine Maria",
            "la": "Beatæ Virginis Mariæ"
        },
        "Martyrs": {
            "en": "Martyrs",
            "it": "Martiri",
            "la": "Martyrum"
        },
        "Pastors": {
            "en": "Pastors",
            "it": "Pastori",
            "la": "Pastorum"
        },
        "Doctors": {
            "en": "Doctors",
            "it": "Dottori della Chiesa",
            "la": "Doctorum Ecclesiae"
        },
        "Virgins": {
            "en": "Virgins",
            "it": "Vergini",
            "la": "Virginum"
        },
        "Holy Men and Women": {
            "en": "Holy Men and Women",
            "it": "Santi e delle Sante",
            "la": "Sanctorum et Sanctarum"
        },
        "For One Martyr": {
            "en": "For One Martyr",
            "it": "Per un martire",
            "la": "Pro uno martyre"
        },
        "For Several Martyrs": {
            "en": "For Several Martyrs",
            "it": "Per più martiri",
            "la": "Pro pluribus martyribus"
        },
        "For Missionary Martyrs": {
            "en": "For Missionary Martyrs",
            "it": "Per i martiri missionari",
            "la": "Pro missionariis martyribus"
        },
        "For a Virgin Martyr": {
            "en": "For a Virgin Martyr",
            "it": "Per una vergine martire",
            "la": "Pro virgine martyre"
        },
        "For Several Pastors": {
            "en": "For Several Pastors",
            "it": "Per i pastori",
            "la": "Pro Pastoribus"
        },
        "For a Pope": {
            "en": "For a Pope",
            "it": "Per i papi",
            "la": "Pro Papa"
        },
        "For a Bishop": {
            "en": "For a Bishop",
            "it": "Per i vescovi",
            "la": "Pro Episcopo"
        },
        "For One Pastor": {
            "en": "For One Pastor",
            "it": "Per un Pastore",
            "la": "Pro Pastoribus"
        },
        "For Missionaries": {
            "en": "For Missionaries",
            "it": "Per i missionari",
            "la": "Pro missionariis"
        },
        "For One Virgin": {
            "en": "For One Virgin",
            "it": "Per una vergine",
            "la": "Pro una virgine"
        },
        "For Several Virgins": {
            "en": "For Several Virgins",
            "it": "Per più vergini",
            "la": "Pro pluribus virginibus"
        },
        "For Religious": {
            "en": "For Religious",
            "it": "Per i religiosi",
            "la": "Pro Religiosis"
        },
        "For Those Who Practiced Works of Mercy": {
            "en": "For Those Who Practiced Works of Mercy",
            "it": "Per gli operatori di misericordia",
            "la": "Pro iis qui opera Misericordiæ Exercuerunt"
        },
        "For an Abbot": {
            "en": "For an Abbot",
            "it": "Per un abate",
            "la": "Pro abbate"
        },
        "For a Monk": {
            "en": "For a Monk",
            "it": "Per un monaco",
            "la": "Pro monacho"
        },
        "For a Nun": {
            "en": "For a Nun",
            "it": "Per i religiosi",
            "la": "Pro moniali"
        },
        "For Educators": {
            "en": "For Educators",
            "it": "Per gli educatori",
            "la": "Pro Educatoribus"
        },
        "For Holy Women": {
            "en": "For Holy Women",
            "it": "Per le sante",
            "la": "Pro Sanctis Mulieribus"
        },
        "For One Saint": {
            "en": "For One Saint",
            "it": "Per un Santo",
            "la": "Pro uno Sancto"
        },
        "or": {
            "en": "or",
            "it": "oppure",
            "la": "vel"
        },
        "Proper": {
            "en": "Proper",
            "it": "Proprio",
            "la": "Proprium"
        },
        "green": {
            "en": "green",
            "it": "verde",
            "la": "viridis"
        },
        "purple": {
            "en": "purple",
            "it": "viola",
            "la": "purpura"
        },
        "white": {
            "en": "white",
            "it": "bianco",
            "la": "albus"
        },
        "red": {
            "en": "red",
            "it": "rosso",
            "la": "ruber"
        },
        "pink": {
            "en": "pink",
            "it": "rosa",
            "la": "rosea"
        },
        "Customize options for generating the Roman Calendar": {
            "en": "Customize options for generating the Roman Calendar",
            "it": "Personalizza le opzioni per la generazione del Calendario Romano",
            "la": "Elige optiones per generationem Calendarii Romani"
        },
        "Generate Roman Calendar": {
            "en": "Generate Roman Calendar",
            "it": "Genera Calendario Romano",
            "la": "Calendarium Romanum Generare"
        },
        "Liturgical Calendar Calculation for a Given Year": {
            "en": "Liturgical Calendar Calculation for a Given Year",
            "it": "Calcolo del Calendario Liturgico per un dato anno",
            "la": "Computus Calendarii Liturgici pro anno dedi"
        },
        "HTML presentation elaborated by JAVASCRIPT using an AJAX request to a %s": {
            "en": "HTML presentation elaborated by JAVASCRIPT using an AJAX request to a %s",
            "it": "Presentazione HTML elaborata con JAVASCRIPT usando una richiesta AJAX al motore PHP %s",
            "la": "Repraesentatio HTML elaborata cum JAVASCRIPT utendo petitionem AJAX ad machinam PHP %s"
        },
        "You are requesting a year prior to 1970: it is not possible to request years prior to 1970.": {
            "en": "You are requesting a year prior to 1970: it is not possible to request years prior to 1970.",
            "it": "Stai effettuando una richiesta per un anno che è precedente al 1970: non è possibile richiedere anni precedenti al 1970.",
            "la": "Rogavisti annum ante 1970: non potest rogare annos ante annum 1970."
        },
        "Configurations being used to generate this calendar:": {
            "en": "Configurations being used to generate this calendar:",
            "it": "Configurazioni utilizzate per la generazione di questo calendario:",
            "la": "Optiones electuus ut generare hic calendarium:"
        },
        "Date in Gregorian Calendar": {
            "en": "Date in Gregorian Calendar",
            "it": "Data nel Calendario Gregoriano",
            "la": "Dies in Calendario Gregoriano"
        },
        "General Roman Calendar Festivity": {
            "en": "General Roman Calendar Festivity",
            "it": "Festività nel Calendario Romano Generale",
            "la": "Festivitas in Calendario Romano Generale"
        },
        "Grade of the Festivity": {
            "en": "Grade of the Festivity",
            "it": "Grado della Festività",
            "la": "Gradum Festivitatis"
        },
        "YEAR": {
            "en": "YEAR",
            "it": "ANNO",
            "la": "ANNUM"
        },
        "EPIPHANY": {
            "en": "EPIPHANY",
            "it": "EPIFANIA",
            "la": "EPIPHANIA"
        },
        "ASCENSION": {
            "en": "ASCENSION",
            "it": "ASCENSIONE",
            "la": "ASCENSIO",
        },
        "Month": {
            "en": "Month",
            "it": "Mese",
            "la": "Mensis"
        },
        "FERIA": {
            "en": "<i>weekday</i>",
            "it": "<i>feria</i>",
            "la": "<i>feria</i>"
        },
        "COMMEMORATION": {
            "en": "Commemoration",
            "it": "Commemorazione",
            "la": "Commemoratio"
        },
        "OPTIONAL MEMORIAL": {
            "en": "Optional memorial",
            "it": "Memoria facoltativa",
            "la": "Memoria ad libitum"
        },
        "MEMORIAL": {
            "en": "Memorial",
            "it": "Memoria",
            "la": "Memoria"
        },
        "FEAST": {
            "en": "Feast",
            "it": "Festa",
            "la": "Festum"
        },
        "FEAST OF THE LORD": {
            "en": "Feast of the Lord",
            "it": "Festa del Signore",
            "la": "Festa Domini"
        },
        "SOLEMNITY": {
            "en": "Solemnity",
            "it": "Solennità",
            "la": "Sollemnitas"
        },
        "HIGHER RANKING SOLEMNITY": {
            "en": "<i>precedence over solemnities</i>",
            "it": "<i>precedenza sulle solennità</i>",
            "la": "<i>præcellentia ante solemnitates</i>"
        },
        "Information about the current calculation of the Liturgical Year": {
            "en": "Information about the current calculation of the Liturgical Year",
            "it": "Informazioni sull'attuale calcolo dell'Anno Liturgico",
            "la": "Notitiæ de computatione præsente Anni Liturgici"
        }
    },
    $daysOfTheWeek = [
        "dies Solis",
        "dies Lunae",
        "dies Martis",
        "dies Mercurii",
        "dies Iovis",
        "dies Veneris",
        "dies Saturni"
    ],
    $months = [
        "Ianuarius",
        "Februarius",
        "Martius",
        "Aprilis",
        "Maius",
        "Iunius",
        "Iulius",
        "Augustus",
        "September",
        "October",
        "November",
        "December"
    ],
    $GRADE = [],
    __ = $key => {
        $lcl = $Settings.locale.toLowerCase();
        if ($messages !== null && typeof $messages == 'object') {
            if ($messages.hasOwnProperty($key) && typeof $messages[$key] == 'object') {
                if ($messages[$key].hasOwnProperty($lcl)) {
                    return $messages[$key][$lcl];
                } else {
                    return $messages[$key]["en"];
                }
            } else {
                return $key;
            }
        } else {
            return $key;
        }
    },
    getLatinDateStr = $date => {
        $festivity_date_str = $daysOfTheWeek[$date.getUTCDay()];
        $festivity_date_str += ', ';
        $festivity_date_str += $date.getUTCDate();
        $festivity_date_str += ' ';
        $festivity_date_str += $months[$date.getUTCMonth()];
        $festivity_date_str += ' ';
        $festivity_date_str += $date.getUTCFullYear();
        return $festivity_date_str;
    },
    createHeader = () => {
        document.title = __("Generate Roman Calendar");
        $('#settingsWrapper').dialog("destroy").remove();
        $('header').empty();
        let templateStr = __('HTML presentation elaborated by JAVASCRIPT using an AJAX request to a %s');
        templateStr = templateStr.replace('%s','<a href="../../LitCalEngine.php">PHP engine</a>');
        let $header = `
            <h1 style="text-align:center;">${__('Liturgical Calendar Calculation for a Given Year')} (${$Settings.year})</h1>
            <h2 style="text-align:center;">${templateStr}</h2>
            <div style="text-align:center;border:2px groove White;border-radius:6px;width:60%;margin:0px auto;padding-bottom:6px;">
            <h3>${__('Configurations being used to generate this calendar:')}</h3>
            <span>${__('YEAR')} = ${$Settings.year}, ${__('EPIPHANY')} = ${$Settings.epiphany}, ${__('ASCENSION')} = ${$Settings.ascension}, CORPUS CHRISTI = ${$Settings.corpusChristi}, LOCALE = ${$Settings.locale}</span>
            </div>`,
        $tbheader = `<tr><th>${__("Month")}</th><th>${__("Date in Gregorian Calendar")}</th><th>${__("General Roman Calendar Festivity")}</th><th>${__("Grade of the Festivity")}</th></tr>`,
        $settingsDialog = `<div id="settingsWrapper"><form id="calSettingsForm"><table id="calSettings">
        <tr><td colspan="2"><label>${__('YEAR')}: </td><td colspan="2"><input type="number" name="year" id="year" min="1969" max="9999" value="${$Settings.year}" /></label></td></tr>
        <tr><td><label>${__('LOCALE')}: </td><td><select name="locale" id="locale"><option value="EN" ${($Settings.locale === "EN" ? " SELECTED" : "")}>ENGLISH</option><option value="IT" ${($Settings.locale === "IT" ? " SELECTED" : "")}>ITALIANO</option><option value="LA" ${($Settings.locale === "LA" ? " SELECTED" : "")}>LATINO</option></select></label></td><td>${__('NATIONAL PRESET')}: </td><td><select id="nationalcalendar" name="nationalcalendar"><option value=""></option><option value="VATICAN" ${($Settings.nationalcalendar === "VATICAN" ? " SELECTED" : "")}>${__('Vatican')}</option><option value="ITALY" ${($Settings.nationalcalendar === "ITALY" ? " SELECTED" : "")}>${__('Italy')}</option><option value="USA" ${($Settings.nationalcalendar === "USA" ? " SELECTED" : "")}>USA</option></select></td></tr>
        <tr><td><label>${__('EPIPHANY')}: </td><td><select name="epiphany" id="epiphany"><option value="JAN6" ${($Settings.epiphany === "JAN6" ? " SELECTED" : "")}>${__('January 6')}</option><option value="SUNDAY_JAN2_JAN8" ${($Settings.epiphany === "SUNDAY_JAN2_JAN8" ? " SELECTED" : "")}>${__('Sunday Jan 2↔Jan 8')}</option></select></label></td><td>${__('DIOCESAN PRESET')}: </td><td><select id="diocesancalendar" name="diocesancalendar" ${($Settings.nationalcalendar == '' || $Settings.nationalcalendar == 'VATICAN' ) ? 'disabled' : ''}></select></td></tr>
        <tr><td><label>${__('ASCENSION')}: </td><td><select name="ascension" id="ascension"><option value="THURSDAY" ${($Settings.ascension === "THURSDAY" ? " SELECTED" : "")}>${__('Thursday')}</option><option value="SUNDAY" ${($Settings.ascension === "SUNDAY" ? " SELECTED" : "")}>${__('Sunday')}</option></select></label></td><td></td><td></td></tr>
        <tr><td><label>CORPUS CHRISTI: </td><td><select name="corpusChristi" id="corpusChristi"><option value="THURSDAY" ${($Settings.corpusChristi === "THURSDAY" ? " SELECTED" : "")}>${__('Thursday')}</option><option value="SUNDAY" ${($Settings.corpusChristi === "SUNDAY" ? " SELECTED" : "")}>${__('Sunday')}</option></select></label></td><td></td><td></td></tr>
        <tr><td colspan="4" style="text-align:center;"><input type="submit" id="generateLitCal" value="${__("Generate Roman Calendar")}" /></td></tr>
        </table></form></div>`;
        $('header').html($header);
        $('#LitCalTable thead').html($tbheader);

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
    document.title = __("Generate Roman Calendar");
    $('.backNav').attr('href',`https://litcal${stagingURL}.johnromanodorazio.com/usage.php`);
    createHeader();
    $(document).on('click', '#openSettings', () => { $('#settingsWrapper').dialog("open"); });
    $('#generateLitCal').button();
    $(document).on("submit", "#calSettingsForm", event => {
        event.preventDefault();
        let formValues = $(event.currentTarget).serializeArray();
        for(const obj of formValues){
            $Settings[obj.name] = obj.value;
        }

        console.log('$Settings = ');
        console.log($Settings);

        $GRADE = [
            __("FERIA"),
            __("COMMEMORATION"),
            __("OPTIONAL MEMORIAL"),
            __("MEMORIAL"),
            __("FEAST"),
            __("FEAST OF THE LORD"),
            __("SOLEMNITY"),
            __("HIGHER RANKING SOLEMNITY")
        ];
        $('#settingsWrapper').dialog("close");
        genLitCal();
        return false;
    });

    if($('#nationalcalendar').val() !== "ITALY"){
        $('#diocesancalendar').prop('disabled',true);
    }

    $(document).on('change','#nationalcalendar', ev => {
        switch( $(ev.currentTarget).val() ){
          case "VATICAN":
            $('#locale').val('LA');
            $('#epiphany').val('JAN6');
            $('#ascension').val('THURSDAY');
            $('#corpusChristi').val('THURSDAY');
            $('#diocesancalendar').val("");
            $Settings.locale = 'LA';
            $Settings.epiphany = 'JAN6';
            $Settings.ascension = 'THURSDAY';
            $Settings.corpusChristi = 'THURSDAY';
            $Settings.diocesancalendar = '';
            $Settings.nationalcalendar = 'VATICAN';

            $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled',true);
          break;
          case "ITALY":
            $('#locale').val('IT');
            $('#epiphany').val('JAN6');
            $('#ascension').val('SUNDAY');
            $('#corpusChristi').val('SUNDAY');
            $Settings.locale = 'IT';
            $Settings.epiphany = 'JAN6';
            $Settings.ascension = 'SUNDAY';
            $Settings.corpusChristi = 'SUNDAY';
            $Settings.diocesancalendar = '';
            $Settings.nationalcalendar = 'ITALY';
            $('#calSettingsForm :input').not('#diocesancalendar').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled',true);
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
            $('#locale').val('EN');
            $('#epiphany').val('SUNDAY_JAN2_JAN8');
            $('#ascension').val('SUNDAY');
            $('#corpusChristi').val('SUNDAY');
            $Settings.locale = 'EN';
            $Settings.epiphany = 'SUNDAY_JAN2_JAN8';
            $Settings.ascension = 'SUNDAY';
            $Settings.corpusChristi = 'SUNDAY';
            $Settings.diocesancalendar = '';
            $Settings.nationalcalendar = 'USA';
            $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled',true);
            
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
            $('#calSettingsForm :input').prop('disabled',false);
            $('#diocesancalendar').val("").prop('disabled',true);
            $Settings.nationalcalendar = '';
        }
    });

    $(document).on('change', '#diocesancalendar', ev => {
        $Settings.diocesancalendar = $(ev.currentTarget).val();
    });

    $('#settingsWrapper').dialog("open");
});

Object.filter = (obj, predicate) => 
Object.keys(obj)
      .filter( key => predicate(obj[key]) )
      .reduce( (res, key) => (res[key] = obj[key], res), {} );

