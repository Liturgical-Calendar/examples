<?php

if (!function_exists('pgettext')) {

    function pgettext($context, $msgid)
    {
        $contextString = "{$context}\004{$msgid}";
        $translation = dcgettext('litexmplphp', $contextString, LC_MESSAGES);
       //$translation = _( $contextString );
        if ($translation == $contextString) {
            return $msgid;
        } else {
            return $translation;
        }
    }

}
