<?php

class LitColor {
    const GREEN     = "green";
    const PURPLE    = "purple";
    const WHITE     = "white";
    const RED       = "red";
    const PINK      = "pink";
    public static array $values = [ "green", "purple", "white", "red", "pink" ];

    public static function isValid( string $value ) {
        if( strpos($value, ',') ) {
            return areValid( explode(',', $value) );
        }
        return in_array( $value, self::$values );
    }

    public static function areValid( array $values ){
        return empty( array_diff( $values, self::$values ) );
    }

    public static function i18n( string|array $value, string $locale ) : string|array {
        if( is_array( $value ) ) {
            return array_map( function($item) use($locale) { return self::i18n( $item, $locale ); }, $value );
        }
        switch( $value ) {
            case self::GREEN:
                /**translators: context = liturgical color */
                return $locale === 'LA' ? 'viridis'     : _( "green" );
            case self::PURPLE:
                /**translators: context = liturgical color */
                return $locale === 'LA' ? 'purpura'     : _( "purple" );
            case self::WHITE:
                /**translators: context = liturgical color */
                return $locale === 'LA' ? 'albus'       : _( "white" );
            case self::RED:
                /**translators: context = liturgical color */
                return $locale === 'LA' ? 'ruber'       : _( "red" );
            case self::PINK:
                /**translators: context = liturgical color */
                return $locale === 'LA' ? 'rosea'       : _( "pink" );
        }
    }
}
