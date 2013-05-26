/*
 * This file is part of nzbget
 *
 * Copyright (C) 2012 Andrey Prygunkov <hugbug@users.sourceforge.net>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * $Revision: 548 $
 * $Date: 2013-01-21 22:19:04 +0100 (Mon, 21 Jan 2013) $
 *
 */

/*
 * In this module:
 *   1) Status Infos on main page (speed, time, paused state etc.);
 *   2) Statistics and Status dialog.
 */

/*** STATUS INFOS ON MAIN PAGE AND STATISTICS DIALOG ****************************************/
 
var Status = (new function($)
{
	'use strict';

	// Properties (public)
	this.status;
	
	// Controls
	var $SpeedLimitInput;
	var $CHPauseDownload;
	var $CHPausePostProcess;
	var $CHPauseScan;
	var $CHSoftPauseDownload;
	var $StatusPausing;
	var $StatusPaused;
	var $StatusSoftPaused;
	var $StatusLeft;
	var $StatusSpeed;
	var $StatusSpeedIcon;
	var $StatusTimeIcon;
	var $StatusTime;
	var $StatusURLs;
	var $PlayBlock;
	var $PlayButton;
	var $PauseButton;
	var $PlayAnimation;
	var $CurSpeedLimit;
	var $CurSpeedLimitBlock;
	var $LimitDialog;
	var $StatDialog;
	var $ScheduledPauseDialog;
	var $PauseForInput;

	// State
	var status;
	var lastPlayState = 0;
	var lastAnimState = 0;
	var playInitialized = false;
	var lastSoftPauseState = 0;
	var modalShown = false;

	this.init = function()
	{
		$SpeedLimitInput = $('#SpeedLimitInput');
		$CHPauseDownload = $('#CHPauseDownload');
		$CHPausePostProcess = $('#CHPausePostProcess');
		$CHPauseScan = $('#CHPauseScan');
		$CHSoftPauseDownload = $('#CHSoftPauseDownload');
		$PlayBlock = $('#PlayBlock');
		$PlayButton = $('#PlayButton');
		$PauseButton = $('#PauseButton');
		$PlayAnimation = $('#PlayAnimation');
		$StatusPausing = $('#StatusPausing');
		$StatusPaused = $('#StatusPaused');
		$StatusSoftPaused = $('#StatusSoftPaused');
		$StatusLeft = $('#StatusLeft');
		$StatusSpeed = $('#StatusSpeed');
		$StatusSpeedIcon = $('#StatusSpeedIcon');
		$StatusTimeIcon = $('#StatusTimeIcon');
		$StatusTime = $('#StatusTime');
		$StatusURLs = $('#StatusURLs');
		$CurSpeedLimit = $('#CurSpeedLimit');
		$CurSpeedLimitBlock = $('#CurSpeedLimitBlock');
		$LimitDialog = $('#LimitDialog');
		$StatDialog = $('#StatDialog');
		$ScheduledPauseDialog = $('#ScheduledPauseDialog')
		$PauseForInput = $('#PauseForInput');
		
		if (UISettings.setFocus)
		{
			$LimitDialog.on('shown', function()
			{
				$('#SpeedLimitInput').focus();
			});
			$ScheduledPauseDialog.on('shown', function()
			{
				$('#PauseForInput').focus();
			});
		}

		$PlayAnimation.hover(function() { $PlayBlock.addClass('hover'); }, function() { $PlayBlock.removeClass('hover'); });
		
		// temporary pause the play animation if any modal is shown (to avoid artifacts in safari)
		$('body >.modal').on('show', modalShow);
		$('body > .modal').on('hide', modalHide);
	}

	this.update = function()
	{
		var _this = this;
		RPC.call('status', [], 
			function(curStatus)
			{
				status = curStatus;
				_this.status = status;
				RPC.next();
			});
	}

	this.redraw = function()
	{
		redrawStatistics();
		redrawInfo()
	}
	
	function redrawStatistics()
	{
		var content = '';

		content += '<tr><td>NZBGet version</td><td class="text-right">' + Options.option('Version') + '</td></tr>';
		content += '<tr><td>Uptime</td><td class="text-right">' + Util.formatTimeHMS(status.UpTimeSec) + '</td></tr>';
		content += '<tr><td>Download time</td><td class="text-right">' + Util.formatTimeHMS(status.DownloadTimeSec) + '</td></tr>';
		content += '<tr><td>Total downloaded</td><td class="text-right">' + Util.formatSizeMB(status.DownloadedSizeMB) + '</td></tr>';
		content += '<tr><td>Remaining</td><td class="text-right">' + Util.formatSizeMB(status.RemainingSizeMB) + '</td></tr>';
		content += '<tr><td>Free disk space</td><td class="text-right">' + Util.formatSizeMB(status.FreeDiskSpaceMB) + '</td></tr>';
		content += '<tr><td>Average download speed</td><td class="text-right">' + Util.round0(status.AverageDownloadRate / 1024) + ' KB/s</td></tr>';
		content += '<tr><td>Current download speed</td><td class="text-right">' + Util.round0(status.DownloadRate / 1024) + ' KB/s</td></tr>';
		content += '<tr><td>Current speed limit</td><td class="text-right">' + Util.round0(status.DownloadLimit / 1024) + ' KB/s</td></tr>';

		$('#StatisticsTable tbody').html(content);

		content = '';
		content += '<tr><td>Download</td><td class="text-right">';
		if (status.DownloadPaused || status.Download2Paused)
		{
			content += status.Download2Paused ? '<span class="label label-status label-warning">paused</span>' : '';
			content += status.Download2Paused && status.DownloadPaused ? ' + ' : '';
			content += status.DownloadPaused ? '<span class="label label-status label-warning">soft-paused</span>' : '';
		}
		else
		{
			content += '<span class="label label-status label-success">active</span>';
		}
		content += '</td></tr>';

		content += '<tr><td>Post-processing</td><td class="text-right">' + (Options.option('PostProcess') === '' ?
			'<span class="label label-status">disabled</span>' :
			(status.PostPaused ?
			'<span class="label label-status label-warning">paused</span>' :
			'<span class="label label-status label-success">active</span>')) +
			'</td></tr>';

		content += '<tr><td>NZB-Directory scan</td><td class="text-right">' + (Options.option('NzbDirInterval') === '0' ?
			'<span class="label label-status">disabled</span>' :
			(status.ScanPaused ?
			'<span class="label label-status label-warning">paused</span>' :
			'<span class="label label-status label-success">active</span>')) +
			'</td></tr>';

		if (status.ResumeTime > 0)
		{
			content += '<tr><td>Autoresume</td><td class="text-right">' + Util.formatTimeHMS(status.ResumeTime - status.ServerTime) + '</td></tr>';
		}
			
		content += '</tbody>';
		content += '</table>';

		$('#StatusTable tbody').html(content);
	}

	function redrawInfo()
	{
		Util.show($CHPauseDownload, status.Download2Paused);
		Util.show($CHPausePostProcess, status.PostPaused);
		Util.show($CHPauseScan, status.ScanPaused);
		Util.show($CHSoftPauseDownload, status.DownloadPaused);

		updatePlayAnim();
		updatePlayButton();

		if (status.ServerStandBy)
		{
			$StatusSpeed.html('--- KB/s');
			if (status.ResumeTime > 0)
			{
				$StatusTime.html(Util.formatTimeLeft(status.ResumeTime - status.ServerTime));
			}
			else if (status.RemainingSizeMB > 0 || status.RemainingSizeLo > 0)
			{
				if (status.AverageDownloadRate > 0)
				{
					$StatusTime.html(Util.formatTimeLeft(status.RemainingSizeMB*1024/(status.AverageDownloadRate/1024)));
				}
				else
				{
					$StatusTime.html('--h --m');
				}
			}
			else
			{
				$StatusTime.html('0h 0m');
			}
		}
		else
		{
			$StatusSpeed.html(Util.round0(status.DownloadRate / 1024) + ' KB/s');
			if (status.DownloadRate > 0)
			{
				$StatusTime.html(Util.formatTimeLeft(status.RemainingSizeMB*1024/(status.DownloadRate/1024)));
			}
			else
			{
				$StatusTime.html('--h --m');
			}
		}

		$StatusSpeedIcon.toggleClass('icon-plane', status.DownloadLimit === 0);
		$StatusSpeedIcon.toggleClass('icon-truck', status.DownloadLimit !== 0);
		$StatusTime.toggleClass('scheduled-resume', status.ServerStandBy && status.ResumeTime > 0);
		$StatusTimeIcon.toggleClass('icon-time', !(status.ServerStandBy && status.ResumeTime > 0));
		$StatusTimeIcon.toggleClass('icon-time-orange', status.ServerStandBy && status.ResumeTime > 0);
	}

	function updatePlayButton()
	{
		var SoftPause = status.DownloadPaused && (!lastAnimState || !UISettings.activityAnimation);
		if (SoftPause !== lastSoftPauseState)
		{
			lastSoftPauseState = SoftPause;
			$PauseButton.removeClass('img-download-green').removeClass('img-download-green-orange').
				addClass(SoftPause ? 'img-download-green-orange' : 'img-download-green');
			$PlayButton.removeClass('img-download-orange').removeClass('img-download-orange-orange').
				addClass(SoftPause ? 'img-download-orange-orange' : 'img-download-orange');
		}

		var Play = !status.Download2Paused;
		if (Play === lastPlayState)
		{
			return;
		}

		lastPlayState = Play;

		var hideBtn = Play ? $PlayButton : $PauseButton;
		var showBtn = !Play ? $PlayButton : $PauseButton;

		if (playInitialized)
		{
			hideBtn.fadeOut(500);
			showBtn.fadeIn(500);
			if (!Play && !status.ServerStandBy)
			{
				Notification.show('#Notif_Downloads_Pausing');
			}
		}
		else
		{
			hideBtn.hide();
			showBtn.show();
		}

		if (Play)
		{
			$PlayAnimation.removeClass('pause').addClass('play');
		}
		else
		{
			$PlayAnimation.removeClass('play').addClass('pause');
		}

		playInitialized = true;
	}

	function updatePlayAnim()
	{
		// Animate if either any downloads or post-processing is in progress
		var Anim = (!status.ServerStandBy || (status.PostJobCount > 0 && !status.PostPaused)) &&
			(UISettings.refreshInterval !== 0) && !UISettings.connectionError;
		if (Anim === lastAnimState)
		{
			return;
		}

		lastAnimState = Anim;

		if (UISettings.activityAnimation && !modalShown)
		{
			if (Anim)
			{
				$PlayAnimation.fadeIn(1000);
			}
			else
			{
				$PlayAnimation.fadeOut(1000);
			}
		}
	}

	this.playClick = function()
	{
		//Notification.show('#Notif_Play');

		if (lastPlayState)
		{
			// pause all activities
			RPC.call('pausedownload2', [],
				function(){RPC.call('pausepost', [],
				function(){RPC.call('pausescan', [], Refresher.update)})});
		}
		else
		{
			// resume all activities
			RPC.call('resumedownload2', [],
				function(){RPC.call('resumepost', [],
				function(){RPC.call('resumescan', [], Refresher.update)})});
		}
	}

	this.pauseClick = function(data)
	{
		switch (data)
		{
			case 'download2':
				var method = status.Download2Paused ? 'resumedownload2' : 'pausedownload2';
				break;
			case 'post':
				var method = status.PostPaused ? 'resumepost' : 'pausepost';
				break;
			case 'scan':
				var method = status.ScanPaused ? 'resumescan' : 'pausescan';
				break;
			case 'download':
				var method = status.DownloadPaused ? 'resumedownload' : 'pausedownload';
				break;
		}
		RPC.call(method, [], Refresher.update);
	}

	this.limitDialogClick = function()
	{
		$SpeedLimitInput.val('');
		$CurSpeedLimit.text(status.DownloadLimit === 0 ? 'none' : Util.round0(status.DownloadLimit / 1024) + ' KB/s');
		Util.show($CurSpeedLimitBlock, status.DownloadLimit !== 0);
		$LimitDialog.modal();
	}

	this.statDialogClick = function()
	{
		$StatDialog.modal();
	}

	this.setSpeedLimitClick = function()
	{
		var val = $SpeedLimitInput.val();
		var rate = 0;
		if (val == '')
		{
			rate = 0;
		}
		else
		{
			rate = parseInt(val);
			if (isNaN(rate))
			{
				return;
			}
		}
		RPC.call('rate', [rate], function()
		{
			$LimitDialog.modal('hide');
			Notification.show('#Notif_SetSpeedLimit');
			Refresher.update();
		});
	}

	this.scheduledPauseClick = function(seconds)
	{
		RPC.call('pausedownload2', [],
			function(){RPC.call('pausepost', [],
			function(){RPC.call('pausescan', [],
			function(){RPC.call('scheduleresume', [seconds], Refresher.update)})})});
	}

	this.scheduledPauseDialogClick = function()
	{
		$PauseForInput.val('');
		$ScheduledPauseDialog.modal();
	}

	this.pauseForClick = function()
	{
		var val = $PauseForInput.val();
		var minutes = parseInt(val);

		if (isNaN(minutes) || minutes <= 0)
		{
			return;
		}
		
		$ScheduledPauseDialog.modal('hide');
		this.scheduledPauseClick(minutes * 60);
	}

	function modalShow()
	{
		modalShown = true;
		if (lastAnimState)
		{
			$PlayAnimation.hide();
		}
	}

	function modalHide()
	{
		if (lastAnimState)
		{
			$PlayAnimation.show();
		}
		modalShown = false;
	}
}(jQuery));
