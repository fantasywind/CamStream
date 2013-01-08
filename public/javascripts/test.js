var Device = {};
$(function(){
  $("#device-selector").change(device_info);

  function device_info(){
    var $this = $("#device-selector"),
        val = $this.val(),
        option = $this.find("option[value='" + val + "']");
    Device.id = val;
    Device.token = option.attr('token');
    Device.name = option.text();
    $("#register").removeClass('btn-success disabled').html("綁定手機");
  }

  device_info();

  $("#register").click(function(){
    var $this = $(this);
    if ($this.hasClass('disabled'))
      return;
    $.ajax({
      url: '/device/login',
      type: 'POST',
      dataType: 'json',
      data: {token: Device.token},
      success: function (json) {
        if (json.status === 'logined'){
          $this.addClass('btn-success disabled').html("<i class='icon-white icon-ok'></i> 已綁定");
        }
      }
    });
  });

  $("#boardcast").click(function(){
    var name = $("#boardcast-name").val(),
        boardcaster = $("#boardcaster");
    function boardcast (first){
      $.ajax({
        url: '/new/' + name,
        type: 'POST',
        dataType: 'json',
        success: function (json) {
          if (json.status === 'wait'){
            if (first) {
              var html = "<tr class='boardcast' token='" + Device.token + "'><td class='boardcast-name'>" + name + "</td><td><button class='btn disable'>等待中...</button></td></tr>";
              boardcaster.find("tr[token='" + Device.token + "']").remove();
              boardcaster.append(html);
            }
            boardcast(false);
          }
        }
      });
    }
    boardcast(true);
  })
});
