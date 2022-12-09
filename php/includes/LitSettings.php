<?php

include_once( 'enums/Epiphany.php' );
include_once( 'enums/Ascension.php' );
include_once( 'enums/CorpusChristi.php' );
include_once( 'enums/LitLocale.php' );

class LitSettings {
    public int $YEAR;
    public string $Epiphany         = Epiphany::JAN6;
    public string $Ascension        = Ascension::THURSDAY;
    public string $CorpusChristi    = CorpusChristi::THURSDAY;
    public ?string $LOCALE           = null;
    public ?string $NationalCalendar = null;
    public ?string $DiocesanCalendar = null;
    private array $MetaData         = [];

    const ALLOWED_PARAMS  = [
        "YEAR",
        "EPIPHANY",
        "ASCENSION",
        "CORPUSCHRISTI",
        "LOCALE",
        "NATIONALCALENDAR",
        "DIOCESANCALENDAR"
    ];

    //If we can get more data from 1582 (year of the Gregorian reform) to 1969
    // perhaps we can lower the limit to the year of the Gregorian reform
    //For now we'll just deal with the Liturgical Calendar from the Editio Typica 1970
    //const YEAR_LOWER_LIMIT          = 1583;
    const YEAR_LOWER_LIMIT          = 1970;

    //The upper limit is determined by the limit of PHP in dealing with DateTime objects
    const YEAR_UPPER_LIMIT          = 9999;
    
    private function SetVars( array $DATA ) {
        //set values based on the GET global variable
        foreach( $DATA as $key => $value ) {
            $key = strtoupper( $key );
            if( in_array( $key, self::ALLOWED_PARAMS ) ){
                switch( $key ){
                    case "YEAR":
                        if( gettype( $value ) === 'string' ){
                            if( is_numeric( $value ) && ctype_digit( $value ) && strlen( $value ) === 4 ){
                                $value = (int)$value;
                                if( $value >= self::YEAR_LOWER_LIMIT && $value <= self::YEAR_UPPER_LIMIT ){
                                    $this->YEAR = $value;
                                }
                            }
                        } elseif( gettype( $value ) === 'integer' ) {
                            if( $value >= self::YEAR_LOWER_LIMIT && $value <= self::YEAR_UPPER_LIMIT ){
                                $this->YEAR = $value;
                            }
                        }
                        break;
                    case "EPIPHANY":
                        $this->Epiphany         = Epiphany::isValid( strtoupper( $value ) )         ? strtoupper( $value ) : Epiphany::JAN6;
                        break;
                    case "ASCENSION":
                        $this->Ascension        = Ascension::isValid( strtoupper( $value ) )        ? strtoupper( $value ) : Ascension::THURSDAY;
                        break;
                    case "CORPUSCHRISTI":
                        $this->CorpusChristi    = CorpusChristi::isValid( strtoupper( $value ) )    ? strtoupper( $value ) : CorpusChristi::THURSDAY;
                        break;
                    case "LOCALE":
                        $this->LOCALE           = LitLocale::isValid( $value )        ? $value : LitLocale::LATIN;
                        if( strpos($this->LOCALE, '_') === false ) {
                            $this->LOCALE = strtolower( $this->LOCALE );
                        }
                        break;
                    case "NATIONALCALENDAR":
                        $this->NationalCalendar = $value !== "" ? strtoupper( $value ) : null;
                        break;
                    case "DIOCESANCALENDAR":
                        $this->DiocesanCalendar = $value !== "" ? strtoupper( $value ) : null;
                }
            }
        }
    }
  
    public function __construct( array $DATA ) {

        //set a few default values
        $this->YEAR = (int)date("Y");

        if( !empty( $_COOKIE["currentLocale"] ) ) {
            $this->LOCALE = $_COOKIE["currentLocale"];
        }
        elseif( isset( $_SERVER['HTTP_ACCEPT_LANGUAGE'] ) ) {
            $this->LOCALE = Locale::acceptFromHttp( $_SERVER['HTTP_ACCEPT_LANGUAGE'] );
        }
        else {
            $this->LOCALE = LitLocale::LATIN;
        }
        if( strpos($this->LOCALE, '_') === false ) {
            $this->LOCALE = strtolower( $this->LOCALE );
        }

        $this->SetVars( $DATA );

        /*if( $this->NationalCalendar !== null ) {
            $this->updateSettingsByNation();
        }*/

    }

    private function updateSettingsByNation( string $stagingURL ) {
        $NationalCalendarMetadata = $this->NationalCalendar !== null && $this->NationalCalendar !== "VATICAN" ? $this->MetaData["NationalCalendarsMetadata"][$this->NationalCalendar] : null;
        switch( $this->NationalCalendar ) {
            case "VATICAN":
            case null:
                $this->Epiphany         = Epiphany::JAN6;
                $this->Ascension        = Ascension::THURSDAY;
                $this->CorpusChristi    = CorpusChristi::THURSDAY;
                $this->LOCALE           = LitLocale::LATIN;
                break;
            default:
                $this->Epiphany         = $NationalCalendarMetadata["settings"]["Epiphany"];
                $this->Ascension        = $NationalCalendarMetadata["settings"]["Ascension"];
                $this->CorpusChristi    = $NationalCalendarMetadata["settings"]["CorpusChristi"];
                $this->LOCALE           = $NationalCalendarMetadata["settings"]["Locale"];
                if( strpos($this->LOCALE, '_') === false ) {
                    $this->LOCALE = strtolower( $this->LOCALE );
                }
                break;
        }
        $baseLocale = strtolower( explode( '_', $this->LOCALE )[0] );
        $localeArray = [
            $this->LOCALE . '.utf8',
            $this->LOCALE . '.UTF-8',
            $this->LOCALE,
            $baseLocale . '_' . strtoupper( $baseLocale ) . '.utf8',
            $baseLocale . '_' . strtoupper( $baseLocale ) . '.UTF-8',
            $baseLocale . '_' . strtoupper( $baseLocale ),
            $baseLocale . '.utf8',
            $baseLocale . '.UTF-8',
            $baseLocale
        ];
        setlocale( LC_ALL, $localeArray );
        bindtextdomain("litcal", "i18n");
        textdomain("litcal");
        ini_set('date.timezone', 'Europe/Vatican');
        if( !isset( $_COOKIE["currentLocale"] ) || $_COOKIE["currentLocale"] !== $this->LOCALE ) {
            setcookie(
                "currentLocale",                                //name
                $this->LOCALE,                                  //value
                time() + 60*60*24*40,                           //expire in 30 days
                "/examples/",                                   //path
                "litcal{$stagingURL}.johnromanodorazio.com",    //domain
                true,                                           //https only
                false                                           //httponly (if true, cookie won't be available to javascript)
            );
        }

    }

    public function setMetaData( array $MetaData, string $stagingURL ) {
        $this->MetaData = $MetaData;
        if( $this->DiocesanCalendar !== null ) {
            $this->NationalCalendar = $this->MetaData["DiocesanCalendars"][$this->DiocesanCalendar]["nation"];
        }
        $this->updateSettingsByNation( $stagingURL );
    }

}
