<?php

class Ascension {
    const THURSDAY          = "THURSDAY";
    const SUNDAY            = "SUNDAY";
    public static array $values = [ "THURSDAY", "SUNDAY" ];

    public static function isValid( $value ) {
        return in_array( $value, self::$values );
    }
}
