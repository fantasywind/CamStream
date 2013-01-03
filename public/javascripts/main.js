$(function(){
  // google map initialize
	var options = {
		center: new google.maps.LatLng(25.008, 121.519),
		zoom: 8,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	var mapContainer = $("#map-container");
	//var map = new google.maps.Map(mapContainer[0], options);
	//	mapContainer.css({position: 'absolute', bottom: '40px'})

	$("#available-token").delegate('td', 'hover', function(e){
		var $this = $(this)
		if (e.type == 'mouseenter'){
			$this.parent().find('.btn-danger').show();
		} else {
			$this.parent().find('.btn-danger').hide();
		}
	});

	$("#available-token").delegate('.btn-danger', 'click', function(e){
		var $this = $(this);
		if (!$this.hasClass('double-check-delete')){
			$this.addClass('double-check-delete');
			$this.text('再點刪除');
			var tmp = function(){
				if ($this.hasClass('double-check-delete')){
					$this.removeClass('double-check-delete');
					$this.html('<i class="icon-remove icon-white"></i> 刪除');
				}
			}
			setTimeout(tmp, 3000)
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

	$("#add-source-open").click(function(){
		var tokenContainer = $("#available-token");
		tokenContainer.text("讀取憑證中...");
		var tokenTable = "<table class='table'><thead><tr><th>建立者</th><th>通行碼</th><th>裝置</th><th>到期日</th><th width='70px'></th></tr></thead><tbody>";
		$.getJSON('/auth', {}, function(json){
			var today = new Date();
			for (var i in json){
				var expired = json[i].expired.substring(0, 10) + ' ' + json[i].expired.substring(11, 19);
				var device = json[i].device != '' ? json[i].device : '未連接裝置';
				var className = new Date(json[i].expired) - today > 0 ? 'success' : 'error' 
				tokenTable += "<tr pass-code='" + json[i].pass_code + "' class='" + className + "'><td>" + json[i].maker + "</td><td>" + json[i].pass_code + "</td><td>" + device +  "</td><td>" + expired + "</td>";
				tokenTable += "<td><button class='btn btn-danger btn-mini'><i class='icon-white icon-remove'></i> 刪除</button></td></tr>";	
			}
			tokenTable += "</tbody></table>";
			tokenContainer.html(tokenTable);
		});
		$("#add-token").html('<i class="icon-plus icon-white"></i> 新增憑證');
		$("#new-token-container").empty();
	});
	
	$("#add-token").click(function(){
		var $this = $(this),
			$container = $("#new-token-container");
		
		if (!$this.hasClass('disabled')){
			$this.addClass('disabled');
			$.getJSON('/auth/new', {}, function(json){
				if (json.status == 'success'){
					var token = $("<p>").addClass('pass-code').text(json.pass_code);
					var helper = $("<p>").text('通關號碼：');
					var expired = new Date(json.expired);
					var helper2 = $("<p>").addClass('expired-date-text').text("有效日期：" + expired.getFullYear() + '-' + (expired.getMonth() + 1) + '-' + expired.getDate() + ' ' + expired.getHours() + ':' + expired.getMinutes() + ':' + expired.getSeconds());
					$container.empty().append(helper).append(token).append(helper2);
				} else {
					$container.html('<p>無法取得新憑證，請聯絡系統管理員或稍候再嘗試。</p>');
				}
			})
		}
	});
});
