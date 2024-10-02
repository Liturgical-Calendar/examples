<?php

namespace LiturgicalCalendar\Examples\Php\Enums;

class Epiphany
{
    public const SUNDAY_JAN2_JAN8  = "SUNDAY_JAN2_JAN8";
    public const JAN6              = "JAN6";
    public static array $values = [ "SUNDAY_JAN2_JAN8", "JAN6" ];

    public static function isValid($value)
    {
        return in_array($value, self::$values);
    }
}
