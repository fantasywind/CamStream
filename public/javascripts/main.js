$(function () {
  // google map initialize
	//var options = {
	//	center: new google.maps.LatLng(24.99074, 121.518962),
	//	zoom: 16,
	//	mapTypeId: google.maps.MapTypeId.ROADMAP
	//},
	var mapContainer = $("#map-container"),
  source_selector = $("#source-selector"),
  playerList = {},
	//map = new google.maps.Map(mapContainer[0], options);
  

  //  監聽認證要求
	listenPassCode = function (passCode) {
		if (!passCode) {
			return;
		}

		var listener = function () {
			$.getJSON('/auth/listen/' + passCode, {}, function (json) {
				if (json.status == 'stay') {
					listener();
				} else if (json.status == 'success') {
					alert('連接成功!');
				}
			});
		};
		listener();
	};
	
  //  移入顯示刪除鍵
	$("#available-token").delegate('td', 'hover', function (e) {
		var $this = $(this);
		if (e.type === 'mouseenter') {
			$this.parent().find('.btn-danger').show();
		} else {
			$this.parent().find('.btn-danger').hide();
		}
	});

  //  刪除確認
	$("#available-token").delegate('.btn-danger', 'click', function (e) {
		var $this = $(this),
		    tmp;
		if (!$this.hasClass('double-check-delete')) {
			$this.addClass('double-check-delete');
			$this.text('再點刪除');
			tmp = function () {
				if ($this.hasClass('double-check-delete')) {
					$this.removeClass('double-check-delete');
					$this.html('<i class="icon-remove icon-white"></i> 刪除');
				}
			};
			setTimeout(tmp, 3000);
		} else {
			var passCode = $this.parents('tr').attr('pass-code');
			$.ajax({
				url: '/auth/' + passCode,
				type: 'DELETE',
				success: function(json){
					if (json.status == 'deleted'){
						$this.parents('tr').fadeOut(function(){
							$this.remove();  
						})  
					}  
				}
			})
		}
	});

  //  取得憑證清單
	$("#add-source-open").click(function(){
		var tokenContainer = $("#available-token");
		tokenContainer.text("讀取憑證中...");
		$("#add-token").removeClass('disabled');
		var tokenTable = "<table class='table'><thead><tr><th>通行碼</th><th>裝置</th><th>單位</th><th>到期日</th><th width='70px'></th></tr></thead><tbody>";
		$.getJSON('/auth', {}, function(json){
			var today = new Date();
			for (var i in json){
			    if (json[i].expired != null){
				var expired = json[i].expired.substring(0, 10) + ' ' + json[i].expired.substring(11, 19);
                                var className = new Date(json[i].expired) - today > 0 ? 'success' : 'error';
                            } else {
                                var expired = '-';
                                var className = 'info';
                            }
                            var device = json[i].device != '' ? json[i].device : '未連接裝置';
			    tokenTable += "<tr pass-code='" + json[i].pass_code + "' class='" + className + "'><td>" + json[i].pass_code + "</td><td>" + device +  "</td><td>" + json[i].dep.name +  "</td><td>" + expired + "</td>";
			    tokenTable += "<td><button class='btn btn-danger btn-mini'><i class='icon-white icon-remove'></i> 刪除</button></td></tr>";	
			}
			tokenTable += "</tbody></table>";
			tokenContainer.html(tokenTable);
		});
		$("#add-token").html('<i class="icon-plus icon-white"></i> 新增憑證');
		$("#new-token-container").empty();
	});
	
  //  新增憑證
	$("#add-token").click(function(){
		var $this = $(this),
			$container = $("#new-token-container");
		
		if (!$this.hasClass('disabled')){
			$this.addClass('disabled');
			$.getJSON('/auth/new', {}, function(json){
				if (json.status == 'success'){
				    var token = $("<p>").addClass('pass-code').text(json.pass_code);
				    var helper = $("<p>").text('通關號碼：');
				    var helper2 = $("<p>").addClass('expired-date-text').text("有效期：15 mins");
				    $container.empty().append(helper).append(token).append(helper2);
				    listenPassCode(json.pass_code);
				} else {
				    $container.html('<p>無法取得新憑證，請聯絡系統管理員或稍候再嘗試。</p>');
				}
			})
		}
	});
  
  /*
  //  監聽視訊來源
  function listen_source(first){
    $.getJSON('/listen', {first: first}, function (json){
      if (json.status == 'new_cam'){
        var i, btn;

        if (!source_selector.find('.btn').length){
          source_selector.empty();
        }

        for (i in json.cams){
          $(".live[target-id='" + json.cams[i].id + "']").remove();
          btn = "<button class='live btn' target-id='" + json.cams[i].id + "'><i class='icon-facetime-video'></i> " + json.cams[i].name + "</button>";
          source_selector.append(btn);
        }
      } else if (json.status == 'cam_close'){
         $(".live[target-id='" + json.cam_id + "']").fadeOut();
         $("#" + playerList[json.cam_id]).remove();
         $("#viewer-holder").show();
      }
      listen_source(false);
    });
  }
  listen_source(true);
  */

  function listen_source () {
    $.getJSON('/viewer/listen', {}, function (json) {
      if (json.statusText === 'timeout') {
        listen_source();
      } else {

      }
    });
  }
  // 開始監聽來源
  listen_source();

  $("#source-selector").delegate('.live', 'click', function () {
    var $this = $(this),
        id = $this.attr('target-id');
    $.ajax({
      type: 'GET',
      url: '/down/' + id,
      dataType: 'json',
      success: function (json){
        var playerID = 'p' + (playerList.length + 1);
        playerList[id] = playerID;
        $("<div>").attr('id', playerID).appendTo($("#viewer"));
        $("#viewer-holder").hide();
        jwplayer(playerID).setup({
          file: "./transfer/" + json.port,
          type: "mp4",
          autostart: true,
          width: '100%',
          height: 400
        });
      }
    });
  });

  //  初始化播放器
  //jwplayer("p1").setup({
  //  file: "./v/1",
  //  type: "mp4"
  //});
});
