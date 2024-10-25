<?php

namespace LiturgicalCalendar\Examples\Php\Enums;

class YearType
{
    public const LITURGICAL     = "LITURGICAL";
    public const CIVIL          = "CIVIL";
    public static array $values = [ "LITURGICAL", "CIVIL" ];

    public static function isValid($value)
    {
        return in_array($value, self::$values);
    }
}
