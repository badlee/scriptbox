$(function () {
    var open = true;
    $('#menu-toggle').live('click', function () {
        if ($('#wrapper').hasClass('right-sidebar')) {
            if (open == true) {
                $('#sidebar').css('display', 'none');
                $('#page-wrapper').css('margin-right', '0px');
                open = false;
            }
            else {
                $('#sidebar').css('display', 'block');
                $('#page-wrapper').css('margin-right', '250px');
                open = true;
            }
        } else {
            if (open == true) {
                $('#sidebar').css('display', 'none');
                $('#page-wrapper').css('margin-left', '0px');
                open = false;
            }
            else {
                $('#sidebar').css('display', 'block');
                $('#page-wrapper').css('margin-left', '250px');
                open = true;
            }
        }
    });
});