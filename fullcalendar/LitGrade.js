class LitGrade {
    static HIGHER_SOLEMNITY = 7;
    static SOLEMNITY        = 6;
    static FEAST_LORD       = 5;
    static FEAST            = 4;
    static MEMORIAL         = 3;
    static MEMORIAL_OPT     = 2;
    static COMMEMORATION    = 1;
    static WEEKDAY          = 0;
    static values           = [ 0, 1, 2, 3, 4, 5, 6, 7 ];
    static valueToString    = {
        7:  "celebration with precedence over solemnities",
        6:  "SOLEMNITY",
        5:  "FEAST OF THE LORD",
        4:  "FEAST",
        3:  "Memorial",
        2:  "Optional memorial",
        1:  "Commemoration",
        0:  "weekday"
    }
    static isValid = ( value ) => {
        return LitGrade.values.includes( value );
    };
    static strWTags = ( value ) => {
        let tags;
        switch( value ) {
            case LitGrade.WEEKDAY:
                tags = ['<i>','</i>'];
            break;
            case LitGrade.COMMEMORATION:
                tags = ['<i>','</i>'];
            break;
            case LitGrade.MEMORIAL_OPT:
                tags = ['',''];
            break;
            case LitGrade.MEMORIAL:
                tags = ['',''];
            break;
            case LitGrade.FEAST:
                tags = ['',''];
            break;
            case LitGrade.FEAST_LORD:
                tags = ['<b>','</b>'];
            break;
            case LitGrade.SOLEMNITY:
                tags = ['<b>','</b>'];
            break;
            case LitGrade.HIGHER_SOLEMNITY:
                tags = ['<b><i>','</i></b>'];
            break;
            default:
                tags = ['',''];
        }
        return { "strVal": LitGrade.valueToString[value], "tags": tags };
    }
}

export default LitGrade;
