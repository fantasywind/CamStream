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

  $("#binder").click(function(){
    var inputs = $(".binder-input"),
        statusText = $("#binder-status"),
        modal = $("#binder-modal");

    inputs.hide();
    statusText.addClass('alert-info').removeClass('alert-danger').text('與伺服器連線中...');
    modal.modal('show');
    $.getJSON('/auth/check', {}, function (json) {
      if (json.status === 'available') {
        statusText.text('請提供通行碼!');
        inputs.find("input").val('').end().show();
      } else {
        statusText.addClass('alert-danger').removeClass('alert-info').text('目前沒有可使用的通行碼');
      }
    });
  });

  $("#binder-submit").click(function (e) {
    e.preventDefault();
    var passcode = $("#passcode").val(),
        deviceName = $("#device-name").val(),
        selector = $("#device-selector"),
        modal = $("#binder-modal");
    if (passcode == '' || deviceName == ''){
      alert("通行碼及裝置名稱請勿留空");
      return false;
    }

    $.ajax('/auth/' + passcode + '/' + deviceName, {
      type: 'PATCH',
      dataType: 'json',
      success: function (json) {
        if (json.status === 'Uncatched Pass') {
          alert("通行碼錯誤! 請重新檢查後再連線。");
        } else if (json.status === 'Success'){
          var option = "<option value='?' token='" + json.token + "'>" + deviceName + "</option>";
          selector.append(option);
          modal.modal('hide');
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
          } else if (json.status == 'success'){
            var html = "<tr class='boardcast' token='" + Device.token + "'><td class='boardcast-name'>" + name + "</td><td>" + json.port + "</td></tr>";
            console.log(html);
            boardcaster.find("tr[token='" + Device.token + "']").remove();
            boardcaster.append(html);
          }
        }
      });
    }
    boardcast(true);
  })
});
